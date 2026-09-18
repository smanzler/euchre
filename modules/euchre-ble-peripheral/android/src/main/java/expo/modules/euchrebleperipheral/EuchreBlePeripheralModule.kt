package expo.modules.euchrebleperipheral

import android.Manifest
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.ParcelUuid
import android.util.Base64
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.UUID

private val CLIENT_CONFIG_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

private const val DEFAULT_MTU = 23

/** A legacy scan response holds a 128 bit uuid and little else. */
private const val MAX_NAME_BYTES = 12

class AdvertiseOptions : Record {
  @Field var serviceUuid: String = ""

  @Field var toHostUuid: String = ""

  @Field var fromHostUuid: String = ""

  @Field var localName: String = ""
}

class PeripheralException(message: String) : CodedException(message)

class EuchreBlePeripheralModule : Module() {
  private var server: BluetoothGattServer? = null
  private var notifier: BluetoothGattCharacteristic? = null
  private var advertiseCallback: AdvertiseCallback? = null
  private var startPromise: Promise? = null

  private val devices = mutableMapOf<String, BluetoothDevice>()
  private val mtus = mutableMapOf<String, Int>()
  private val outbox = mutableMapOf<String, ArrayDeque<ByteArray>>()
  private var sending = false

  private val context: Context
    get() = appContext.reactContext ?: throw PeripheralException("The app context is gone.")

  private val bluetooth: BluetoothManager
    get() = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      ?: throw PeripheralException("This device has no Bluetooth.")

  override fun definition() = ModuleDefinition {
    Name("EuchreBlePeripheral")

    Events("onCentralSubscribed", "onCentralUnsubscribed", "onCentralWrite", "onPeripheralError")

    Function("isSupported") {
      runCatching {
        val manager = appContext.reactContext
          ?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        manager?.adapter?.isMultipleAdvertisementSupported == true
      }.getOrDefault(false)
    }

    AsyncFunction("startAdvertising") { options: AdvertiseOptions, promise: Promise ->
      startAdvertising(options, promise)
    }

    AsyncFunction("stopAdvertising") {
      stopAdvertising()
    }

    AsyncFunction("notify") { centralId: String, valueBase64: String ->
      enqueue(centralId, Base64.decode(valueBase64, Base64.NO_WRAP))
    }

    OnDestroy {
      stopAdvertising()
    }
  }

  private fun requirePermission(permission: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    if (ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED) return
    throw PeripheralException("Missing the $permission permission.")
  }

  private fun startAdvertising(options: AdvertiseOptions, promise: Promise) {
    requirePermission(Manifest.permission.BLUETOOTH_ADVERTISE)
    requirePermission(Manifest.permission.BLUETOOTH_CONNECT)
    val adapter = bluetooth.adapter ?: throw PeripheralException("This device has no Bluetooth.")
    if (!adapter.isEnabled) throw PeripheralException("Bluetooth is turned off.")
    val advertiser = adapter.bluetoothLeAdvertiser
      ?: throw PeripheralException("This device cannot advertise over Bluetooth LE.")

    stopAdvertising()

    val serviceUuid = UUID.fromString(options.serviceUuid)
    val opened = bluetooth.openGattServer(context, serverCallback)
      ?: throw PeripheralException("The Bluetooth GATT server did not open.")
    server = opened

    val toHost = BluetoothGattCharacteristic(
      UUID.fromString(options.toHostUuid),
      BluetoothGattCharacteristic.PROPERTY_WRITE or
        BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
      BluetoothGattCharacteristic.PERMISSION_WRITE
    )
    val fromHost = BluetoothGattCharacteristic(
      UUID.fromString(options.fromHostUuid),
      BluetoothGattCharacteristic.PROPERTY_NOTIFY,
      BluetoothGattCharacteristic.PERMISSION_READ
    )
    fromHost.addDescriptor(
      BluetoothGattDescriptor(
        CLIENT_CONFIG_UUID,
        BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
      )
    )
    val service = BluetoothGattService(serviceUuid, BluetoothGattService.SERVICE_TYPE_PRIMARY)
    service.addCharacteristic(toHost)
    service.addCharacteristic(fromHost)
    opened.addService(service)
    notifier = fromHost

    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
      .setConnectable(true)
      .build()
    val payload = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .addServiceUuid(ParcelUuid(serviceUuid))
      .build()
    // Android advertises the adapter name, so the table name rides as service
    // data in the scan response instead.
    val scanResponse = AdvertiseData.Builder()
      .addServiceData(ParcelUuid(serviceUuid), trimName(options.localName))
      .build()

    startPromise = promise
    val callback = object : AdvertiseCallback() {
      override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
        startPromise?.resolve(null)
        startPromise = null
      }

      override fun onStartFailure(errorCode: Int) {
        val promiseToFail = startPromise
        startPromise = null
        promiseToFail?.reject(PeripheralException("Advertising failed with code $errorCode."))
      }
    }
    advertiseCallback = callback
    advertiser.startAdvertising(settings, payload, scanResponse, callback)
  }

  private fun trimName(name: String): ByteArray {
    val bytes = name.toByteArray(Charsets.UTF_8)
    return if (bytes.size <= MAX_NAME_BYTES) bytes else bytes.copyOf(MAX_NAME_BYTES)
  }

  private fun stopAdvertising() {
    val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
    advertiseCallback?.let { callback ->
      runCatching { adapter?.bluetoothLeAdvertiser?.stopAdvertising(callback) }
    }
    advertiseCallback = null
    runCatching { server?.close() }
    server = null
    notifier = null
    devices.clear()
    mtus.clear()
    outbox.clear()
    sending = false
  }

  private fun enqueue(centralId: String, value: ByteArray) {
    if (!devices.containsKey(centralId)) {
      throw PeripheralException("That player is not connected.")
    }
    outbox.getOrPut(centralId) { ArrayDeque() }.addLast(value)
    pump()
  }

  /** One notification is in flight at a time; onNotificationSent sends the next. */
  private fun pump() {
    if (sending) return
    val characteristic = notifier ?: return
    val gatt = server ?: return
    for ((centralId, queue) in outbox) {
      val value = queue.removeFirstOrNull() ?: continue
      val device = devices[centralId] ?: continue
      sending = true
      val sent = runCatching { send(gatt, device, characteristic, value) }.getOrDefault(false)
      if (!sent) {
        sending = false
        sendEvent("onPeripheralError", Bundle().apply { putString("message", "A frame was dropped.") })
      }
      return
    }
  }

  private fun send(
    gatt: BluetoothGattServer,
    device: BluetoothDevice,
    characteristic: BluetoothGattCharacteristic,
    value: ByteArray
  ): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return gatt.notifyCharacteristicChanged(device, characteristic, false, value) ==
        BluetoothGatt.GATT_SUCCESS
    }
    @Suppress("DEPRECATION")
    characteristic.value = value
    @Suppress("DEPRECATION")
    return gatt.notifyCharacteristicChanged(device, characteristic, false)
  }

  private val serverCallback = object : BluetoothGattServerCallback() {
    override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
      if (newState != BluetoothProfile.STATE_DISCONNECTED) return
      val id = device.address
      devices.remove(id)
      mtus.remove(id)
      outbox.remove(id)
      sendEvent("onCentralUnsubscribed", Bundle().apply { putString("id", id) })
    }

    override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
      mtus[device.address] = mtu
    }

    override fun onDescriptorWriteRequest(
      device: BluetoothDevice,
      requestId: Int,
      descriptor: BluetoothGattDescriptor,
      preparedWrite: Boolean,
      responseNeeded: Boolean,
      offset: Int,
      value: ByteArray?
    ) {
      if (responseNeeded) {
        server?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
      }
      if (descriptor.uuid != CLIENT_CONFIG_UUID) return
      val enabled = value != null &&
        value.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
      val id = device.address
      if (enabled) {
        devices[id] = device
        sendEvent(
          "onCentralSubscribed",
          Bundle().apply {
            putString("id", id)
            putInt("mtu", mtus[id] ?: DEFAULT_MTU)
          }
        )
        return
      }
      devices.remove(id)
      outbox.remove(id)
      sendEvent("onCentralUnsubscribed", Bundle().apply { putString("id", id) })
    }

    override fun onCharacteristicWriteRequest(
      device: BluetoothDevice,
      requestId: Int,
      characteristic: BluetoothGattCharacteristic,
      preparedWrite: Boolean,
      responseNeeded: Boolean,
      offset: Int,
      value: ByteArray?
    ) {
      if (responseNeeded) {
        server?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
      }
      if (value == null) return
      sendEvent(
        "onCentralWrite",
        Bundle().apply {
          putString("id", device.address)
          putString("value", Base64.encodeToString(value, Base64.NO_WRAP))
        }
      )
    }

    override fun onNotificationSent(device: BluetoothDevice, status: Int) {
      sending = false
      pump()
    }
  }
}