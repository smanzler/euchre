Pod::Spec.new do |s|
  s.name           = 'EuchreBlePeripheral'
  s.version        = '1.0.0'
  s.summary        = 'A Bluetooth LE GATT server for hosting a euchre table'
  s.description    = 'Advertises the euchre service and carries framed messages to and from the seated players.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
