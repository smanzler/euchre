import CoreBluetooth
import ExpoModulesCore

struct AdvertiseOptions: Record {
  @Field var serviceUuid: String = ""
  @Field var toHostUuid: String = ""
  @Field var fromHostUuid: String = ""
  @Field var localName: String = ""
}

/// Three ATT bytes sit in front of every notification payload.
private let attOverhead = 3

private final class PeripheralController: NSObject, CBPeripheralManagerDelegate {
  var onEvent: ((String, [String: Any]) -> Void)?

  private var manager: CBPeripheralManager?
  private var options: AdvertiseOptions?
  private var startPromise: Promise?
  private var fromHost: CBMutableCharacteristic?
  private var centrals: [String: CBCentral] = [:]
  private var outbox: [(central: CBCentral, data: Data)] = []

  func start(options: AdvertiseOptions, promise: Promise) {
    self.options = options
    self.startPromise = promise
    if manager == nil {
      manager = CBPeripheralManager(delegate: self, queue: nil)
      return
    }
    publishIfReady()
  }

  func stop() {
    manager?.stopAdvertising()
    manager?.removeAllServices()
    centrals.removeAll()
    outbox.removeAll()
    fromHost = nil
    options = nil
  }

  func notify(centralId: String, base64: String, promise: Promise) {
    guard let characteristic = fromHost, let manager else {
      promise.reject("E_NOT_ADVERTISING", "The table is not advertising.")
      return
    }
    guard let central = centrals[centralId] else {
      promise.reject("E_NO_CENTRAL", "That player is not connected.")
      return
    }
    guard let data = Data(base64Encoded: base64) else {
      promise.reject("E_BAD_PAYLOAD", "The frame was not valid base64.")
      return
    }
    if outbox.isEmpty,
       manager.updateValue(data, for: characteristic, onSubscribedCentrals: [central]) {
      promise.resolve(nil)
      return
    }
    // The transmit queue is full; peripheralManagerIsReady drains the rest.
    outbox.append((central: central, data: data))
    promise.resolve(nil)
  }

  private func publishIfReady() {
    guard let manager, manager.state == .poweredOn, let options else { return }
    let service = CBMutableService(type: CBUUID(string: options.serviceUuid), primary: true)
    let toHost = CBMutableCharacteristic(
      type: CBUUID(string: options.toHostUuid),
      properties: [.write, .writeWithoutResponse],
      value: nil,
      permissions: [.writeable]
    )
    let notifier = CBMutableCharacteristic(
      type: CBUUID(string: options.fromHostUuid),
      properties: [.notify],
      value: nil,
      permissions: [.readable]
    )
    service.characteristics = [toHost, notifier]
    fromHost = notifier
    manager.removeAllServices()
    manager.add(service)
  }

  private func drainOutbox() {
    guard let manager, let characteristic = fromHost else { return }
    while let next = outbox.first {
      if !manager.updateValue(next.data, for: characteristic, onSubscribedCentrals: [next.central]) {
        return
      }
      outbox.removeFirst()
    }
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      publishIfReady()
    case .unsupported:
      fail("This device cannot act as a Bluetooth peripheral.")
    case .unauthorized:
      fail("Bluetooth permission was refused.")
    case .poweredOff:
      fail("Bluetooth is turned off.")
    default:
      break
    }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    didAdd service: CBService,
    error: Error?
  ) {
    if let error {
      fail(error.localizedDescription)
      return
    }
    guard let options else { return }
    peripheral.startAdvertising([
      CBAdvertisementDataLocalNameKey: options.localName,
      CBAdvertisementDataServiceUUIDsKey: [CBUUID(string: options.serviceUuid)]
    ])
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error {
      fail(error.localizedDescription)
      return
    }
    startPromise?.resolve(nil)
    startPromise = nil
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    central: CBCentral,
    didSubscribeTo characteristic: CBCharacteristic
  ) {
    let id = central.identifier.uuidString
    centrals[id] = central
    onEvent?("onCentralSubscribed", [
      "id": id,
      "mtu": central.maximumUpdateValueLength + attOverhead
    ])
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    central: CBCentral,
    didUnsubscribeFrom characteristic: CBCharacteristic
  ) {
    let id = central.identifier.uuidString
    centrals.removeValue(forKey: id)
    outbox.removeAll { $0.central.identifier == central.identifier }
    onEvent?("onCentralUnsubscribed", ["id": id])
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    didReceiveWrite requests: [CBATTRequest]
  ) {
    for request in requests {
      guard let value = request.value else { continue }
      onEvent?("onCentralWrite", [
        "id": request.central.identifier.uuidString,
        "value": value.base64EncodedString()
      ])
    }
    if let first = requests.first {
      peripheral.respond(to: first, withResult: .success)
    }
  }

  func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
    drainOutbox()
  }

  private func fail(_ message: String) {
    if let promise = startPromise {
      startPromise = nil
      promise.reject("E_PERIPHERAL", message)
      return
    }
    onEvent?("onPeripheralError", ["message": message])
  }
}

public class EuchreBlePeripheralModule: Module {
  private let controller = PeripheralController()

  public func definition() -> ModuleDefinition {
    Name("EuchreBlePeripheral")

    Events("onCentralSubscribed", "onCentralUnsubscribed", "onCentralWrite", "onPeripheralError")

    OnCreate {
      self.controller.onEvent = { [weak self] name, payload in
        self?.sendEvent(name, payload)
      }
    }

    Function("isSupported") { () -> Bool in
      true
    }

    AsyncFunction("startAdvertising") { (options: AdvertiseOptions, promise: Promise) in
      self.controller.start(options: options, promise: promise)
    }

    AsyncFunction("stopAdvertising") { () in
      self.controller.stop()
    }

    AsyncFunction("notify") { (centralId: String, valueBase64: String, promise: Promise) in
      self.controller.notify(centralId: centralId, base64: valueBase64, promise: promise)
    }

    OnDestroy {
      self.controller.stop()
    }
  }
}
