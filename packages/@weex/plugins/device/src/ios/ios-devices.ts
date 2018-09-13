const path = require('path')

import { exec, runAndGetOutput } from '@weex-cli/utils/src/process/process'
import IosEnv from '@weex-cli/utils/src/ios/ios-env'
import { Devices } from '../base/devices'
import { DeviceInfo, RunDeviceOptions } from '../common/device'

export default class IosDevices extends Devices {
  private iosEnv: IosEnv = new IosEnv()

  constructor() {
    super({ type: Devices.TYPES.ios })
    this.iosEnv.isInstalledXcode()
    this.updateList()
  }

  public updateList() {
    this.list = []
    this.concat(this.getIosDevicesList())
  }

  private getIosDevicesList(): Array<DeviceInfo> {
    // Doctor TODO `xcrun`
    const text = runAndGetOutput('xcrun instruments -s devices')
    const devices = []
    const REG_DEVICE = /(.*?) \((.*?)\) \[(.*?)]/

    const lines = text.split('\n')
    for (const line of lines) {
      if (line.indexOf('Watch') >= 0 || line.indexOf('TV') >= 0 || line.indexOf('iPad') >= 0) {
        continue
      }
      const device = line.match(REG_DEVICE)
      if (device !== null) {
        const name = device[1]
        const version = device[2]
        const id = device[3]
        const isSimulator = line.indexOf('Simulator') >= 0 || id.indexOf('-') >= 0
        devices.push({ name, version, id, isSimulator })
      }
    }

    return devices
  }

  async launchById(id: DeviceInfo['id']): Promise<String> {
    try {
      await exec(`xcrun instruments -w ${id}`)
    } catch (error) {
      if (error) {
        if (error.toString().indexOf('Instruments Usage Error') !== -1) {
          // instruments always fail with 255 because it expects more arguments,
          // but we want it to only launch the simulator
          return
        }
        throw error
      }
    }
  }

  async run(options: RunDeviceOptions) {
    const deviceInfo = this.getDeviceById(options.id)

    if (!deviceInfo) {
      throw new Error(`Not find device ${options.id}`)
    }
    try {
      await this.launchById(options.id)
    } catch (e) {
      throw new Error(`Launch fail ${options.id}`)
    }

    if (deviceInfo.isSimulator) {
      try {
        await exec(`xcrun simctl install ${options.id} ${options.appPath}`)
      } catch (e) {
        console.error(e)
        throw new Error(`Instll app fail`)
      }
      if (options.applicationId) {
        try {
          await exec(`xcrun simctl launch ${options.id} ${options.applicationId}`)
        } catch (e) {
          console.log(e)
          throw new Error(`launch app fail`)
        }
      }
    } else {
      // Build to iphone the xxx.app must signed
      const iosDeployPath = path.join(__dirname, '../../node_modules/ios-deploy/build/Release/ios-deploy')
      try {
        await exec(`${iosDeployPath} --justlaunch --debug --id ${options.id} --bundle ${options.appPath}`)
      } catch (e) {
        throw e
      }
    }
  }
}