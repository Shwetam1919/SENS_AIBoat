/**
 * SWCDD Knowledge Database
 * ========================
 * This file contains all SWCDD document content used by GMVCU SENS BOT.
 * Edit this file to update SWCDD content without touching the main HTML.
 * 
 * Usage: loaded via <script src="swcdd_db.js"></script> in gmvcu_chatbot.html
 */

const SWCDD_BUILTIN = {

vip: `SWCDD_GMVIP_RTC_GyroAcc_WhlTicks_v4.0
======================================
Document: SWCDD_GMVIP_RTC_GyroAcc_WhlTicks_v4_0.docx
Version: v4.0 (v3.0 released 08/Jan/2026)
Author: Samartha G Gopali (gso3kor / MS/ENE-CF8-XC)
Reviewers: Joachim Attig (XC-CP/ECB1.1), Dirk Voedisch (XC-CP/ECB1), Anton Alex Raja, ArjunKumar R L

## 1. RTC DRIVER (RA8804CE)
### 1.1 Architecture
- Async proxy-buffer architecture: 16 registers refreshed every 1s via W1R16 I2C sequence
- 10ms OS task (RTC_MainFunction) handles: async refresh, VLF clear, SRT alignment, timer expiry
- I2C sequences: W1R16=async 16-reg read (every 1s), W8=set datetime, W2=RAM write/timer disable, W3=timer config, W4=disable timer

### 1.2 APIs
- IsRTCRunning() -> RTCStatus: checks VLF/VDET flags, returns RTC_OK/RTC_NOT_OK/RTC_NOT_AVAILABLE(255)
- RTC_GetDateTime(RTC_Time*, RTC_Date*) -> RTCStatus: reads from 16-byte async proxy buffer
- RTC_SetDateTime(RTC_Time, RTC_Date) -> RTCStatus: async I2C write (W8 sequence), resets SRT
- RTC_GetRamData(sint8*) / RTC_SetRamData(sint8) -> register 0x07
- RTC_SetFixedTimerInterrupt(uint64 CycleIntervalInMilliSecs) -> configures timer IRQ
- RTC_GetFixedTimerInterrupt(uint64*, uint64*) -> interval + elapsed
- RTC_DisableFixedTimerInterrupt() -> clears TF/TE/TIE flags
- RTC_NotifyWakeupReason() -> called from MainFunction on IRQ wake
- RTC_MainFunction() -> 10ms OS task: async refresh (W1R16), alignment, VLF clear, timer expiry
- RTC_Init() -> state/DLT/validity init
- RTC_SetWakeupNotification(uint8) -> from ISR

### 1.3 Data Structures
- RTC_Time{Seconds:0-59, Min:0-59, Hours:0-23}
- RTC_Date{Day:1-31, Month:1-12, Year:2000-2099}
- RTCStatus: RTC_OK=0, RTC_NOT_OK=1, RTC_NOT_AVAILABLE=255

### 1.4 Proxy Buffer & SRT Mechanism
- Proxy buffer: 16 bytes in GLOBAL_A_RAM, refreshed async by RTC_MainFunction
- SRT (Second Rollover reference Time): reset on each SetDateTime; next read at SRT+1100ms (or +1500ms if proximity conflict)
- Proximity avoidance: if GetDateTime <100ms (or <200ms post-SRT) from scheduled nRT, nRT shifts +/-400ms

### 1.5 Boot Scenarios
- 1a cold start, 1b warm, 2a cold+SetDateTime, 2b warm+rollover
- 3a/3b boundary GetDateTime, 4a cold+mixed, 5b warm+multi-read
- 6b proximity postpone, 7b pre-rollover

### 1.6 VLF Race Fix
- Atomic state management in MainFunction; proxy marked invalid until fresh read completes
- VLF=voltage low flag, VDET=voltage detector flag

### 1.7 Timer
- IRQ on TF flag, captured in 10ms task, notified via RTC_NotifyWakeupReason()
- Validity proposal B: store flags in reserved RTC register bits

### 1.8 Known Bugs
- Bug INFGBP-49014: wrong year after battery disconnect
- Bug RTC1-2951064: unexpected alarm expiry in async I2C flow

### 1.9 DLT Logging
- Enable: SCC_DLT_SET_LOG_LEVEL_MOD RTCHHDL_ DLT_LOG_DEBUG + SCC_DLT_SET_LOG_LEVEL_MOD RTC_MAIN DLT_LOG_DEBUG + SCC_DLT_STORE_CONFIG

## 2. WHEELTICKS DRIVER
### 2.1 APIs
- WhlTicks_InitNCR_NavSensor(WhlTicksStatusType*) -> init state machine, DLT, disable NMEA (CFG-PRT), configure ESF-WT (CFG-ESFWT IDs 8/9)
- WhlTicks_SetNCRNavSnsrInputData(WhlTicksDataType*) -> sends UBX-ESF-MEAS every 100ms

### 2.2 Data Structures
- WhlTicksDataType{flWheelTick, frWheelTick, rlWheelTick, rrWheelTick, wheelSingle, timetag(uint32 ms), IsvehGearStatusInReverse(boolean)}
- Counter: uint16 (0-65535), wraparound at 65535->0. Min ADR rate: 1 Hz. Tx rate: 10 Hz (100ms)

### 2.3 ESF-MEAS Format
- 24 bytes payload, IDs 8 (rlWheelTick) and 9 (rrWheelTick), timetag=32-bit ms counter
- Counter wraparound: u-blox handles rollover internally

### 2.4 Init Sequence
- CFG-PRT (disable NMEA on I2C), CFG-ESFWT (enable IDs 8/9)

### 2.5 DLT & Testing
- DLT: SCC_DLT_SET_LOG_LEVEL_MOD Odo_Main DLT_LOG_DEBUG + SCC_DLT_STORE_CONFIG
- Distance: (RR + RL ticks) / (2 x pulses_per_meter)
- XTM: XTM_MODE_CMD 10 0 4 0 0 0 0001 0
- DLT injection: SCC_DLT_CALL_SW_INJECTION <seq_id> <value>

## 3. GYRO/ACC DRIVER (SMI230 / SMI330 / STMASM330)
### 3.1 APIs
- GyroAcc_InitAccelerometer(GyroAccStatusType*) -> SPI init, range/BW/PWR config
- Acc_GetDataRecord(sint16 *ax, *ay, *az) -> burst SPI read ACC registers (0x12-0x17)
- GyroAcc_InitGyrometer(GyroAccStatusType*) -> SPI init, range/filter/interrupt config
- Gyro_GetDataRecord(sint16 *gx, *gy, *gz, *gTemp) -> burst SPI read GYRO registers (0x02-0x08)
- GyroAccSelfTest(GyroAccSelfTestInfo*) -> Tx/Rx polling per datasheet timing

### 3.2 Hardware
- VCU 1.1: SMI230 (SPI, SPI_GYRO_CS_B + SPI_ACC_CS_B)
- VCU 1.5: SMI330/STMASM330 (SPI same interface)
- Key macros: MAX_POS_RAW_VAL=32768, PHY_MUL=1000000, READ bit=0x80

### 3.3 Ranges & Resolution
- Accel: 0->2g, 1->4g, 2->8g, 3->16g. SMI230: 39.24 maxrange, 0.001197 m/s2/LSB
- Gyro: 000->2000, 001->1000, 010->500, 011->250, 100->125 deg/s. SMI230: 4.363 rad/s max, 0.0001331 rad/s/LSB

### 3.4 DLT & Testing
- DLT: SCC_DLT_SET_LOG_LEVEL_MOD Gyro_Acc DLT_LOG_DEBUG + SCC_DLT_STORE_CONFIG
- XTM GYRO: XTM_MODE_CMD 10 0 4 2 0 0 0001 0; ACC: XTM_MODE_CMD 10 0 4 3 0 0 0001 0

## 4. UNIT TEST PATTERNS
- Framework: GoogleTest + gmock; separate *_utest.cpp and *_Mock.h
- RTC: RTC_utest.cpp — IsRTCRunning, GetDateTime, SetDateTime, MainFunction, VLF, proximity
- WhlTicks: WhlTicks_utest.cpp — InitNCR, SetInputData, ESF-MEAS, wraparound
- GyroAcc: GyroAcc_utest.cpp — InitAccel, InitGyro, GetDataRecord, SelfTest
- Coverage: all RTCStatus returns, uint16 boundaries (0,1,65534,65535), null pointers, I2C errors`,

cm: `SWCDD_GMVCU_ublox_navsensors_Common_Mainline_v1.0
==================================================
Document: SWCDD_GMVCU_ublox_navsensors_Common_mainline v1.0
Released: 13/Apr/2026
Authors: Samartha G Gopali, Manjunath R, Shweta (MS/ENE-CF8-XC)
Reviewer: Joachim Attig (XC-CP/ECB1.1), Review #162070
Gerrit: 1206533 (common mainline merge), 1081833 (GNSS V3/Sensors V2 NDK freeze)

## 1. PLATFORM OVERVIEW
| Feature | VCU 1.1 (RoW) | VCU 1.5 (RoW) | NA | CHN |
|---------|--------------|--------------|-----|-----|
| SoC | SA8155P | SA8295P | - | - |
| GNSS chip | NEO-M8L (UART) | NEO-M9L (UART) | TCP-CAN/ETH | TCP-CAN/ETH |
| IMU | SMI230 (SPI) | SMI330/STMASM330 (SPI) | ETH 3DOF/6DOF | SMI230/330 via VIP |
| GNSS FW | ADR4.32 | ADR5.2RC02 | - | - |
| GNSS_DR_SRC | 1 | 1 | 0 | 0 |

## 2. REPOSITORIES & BRANCHES
- u-blox repo: GNSS/Sensors/GMLocation HAL for RoW (M8/M9)
- navsensors repo: GNSS/Sensors/GMLocation HAL for NA and CHN
- location_sensors repo: u-blox FW update utility (QNX recovery mode)
- gnss-firmware repo: FW artifacts for M8 (ADR4.32) and M9 (ADR5.2RC02)
- Common mainline branch: rb_gmvcu_basesw_sensors_common_main
- VCU 1.1: repo init -u ssh://cm_gerrit/projects/gmvcu/manifests -b rb_main_es_1 -m bosch_vcu_aosp.xml -g android,qnx,autosar,boschtools
- VCU 1.5: repo init -u ssh://cm_gerrit/projects/gmvcu/manifests -b rb_gmvcu_1_5_fc -m bosch_vcu_aosp.xml -g android,qnx,autosar,boschtools

## 3. CALIBRATION IDs & OVERRIDE FILES
| Variant | GNSS_DR_SRC | TCP_LOC_SRC | SENS_IMU_SRC | Override file |
|---------|-------------|-------------|--------------|---------------|
| u-blox RoW | 1 | - | 4 | ublox.override |
| ETH_3DOF | 0 | - | 6 | ETH_3DOF.override |
| ETH_6DOF | 0 | - | 7 | ETH_6DOF.override |
| TCP-CAN-CHN | 0 | 1 | 3 | TCP-CAN-CHN.override |
| TCP-CAN-NA | 0 | 1 | 5 | TCP-CAN-NA.override |
| TCP-ETH-CHN | 0 | 2 | 3 | TCP-ETH-CHN.override |
| TCP-ETH-NA | 0 | 2 | 5 | TCP-ETH-NA.override |
Override path: /data/vendor/calibrations/. SBAT + HWCPN mandatory before override.

## 4. U-BLOX HAL ARCHITECTURE (gps/ directory)
### 4.1 Core Files
- gps/hal/CUbxThread.cpp/h — Main message dispatch loop + GM extensions
- gps/hal/CUbxGpsState.cpp/h — State machine: aiding, MGA, self-test
- gps/hal/CGnssDriver.cpp/h — Top-level GNSS driver
- gps/hal/CParser.cpp/h — UBX/NMEA/RTCM framing
- gps/hal/CSvStatus.cpp/h — Satellite tracking
- gps/hal/CReceiverConfHandler.cpp/h — M8 vs M9 config dispatch
- gps/hal/CSensorsDriver.cpp/h — Sensors integration
- gps/hal/aidl/GmLocationService.cpp/h — GMLocation AIDL
- ubxfwupdate/ — FW update tool (flash.c, receiver.c, ubxmsg.c)

### 4.2 VCU_COMMON_MAINLINE Macro
- VCU_1_1: writeUbxCfgGNSS(uint8_t constFlag, bool m_isPollMsg)
- VCU_1_5: writeUbxCfgGNSS(uint8_t constFlag) — no poll msg param
- Compile-time M8 vs M9 differentiation

### 4.3 Key UBX Message IDs
- CFG-PRT: (0x06,0x00) — port config / NMEA disable
- MON-LLC: (0x0A,0x0D) — variant detection (primary M8/M9 discriminator)
- CFG-OTP: (0x06,0x41) — OTP fuse (fallback discriminator)
- MON-PT2: (0x0A,0x2B) — GNSS self-test result
- MON-SPT: (0x0A,0x2F) — gyro/acc self-test trigger
- CFG-GNSS: (0x06,0x3E) — constellation enable/disable
- CFG-CFG: (0x06,0x09) — save/load/erase config
- NAV-PVT, NAV-STATUS, NAV-ORB: navigation data

### 4.4 Baud Rate Negotiation
- M8: BAUDRATE_COMM=230400, BAUDRATE_DEF=9600, BAUDRATE_FTS=115200
- M9: BAUDRATE_COMM=230400, BAUDRATE_DEF=9600, BAUDRATE_M9_DEF=38400, BAUDRATE_FTS=115200
- maxBaudRate=230400; DELAY_MICROSECONDS=100000 after CFG-PRT
- FW update fallback: 9600:9600:230400 -> 38400:9600:230400 -> 115200:9600:230400

### 4.5 Self-Test (GM-specific)
- parseGyroAccSelfTestResponse() — parses SMI230/SMI330/STMASM330 from MON-SPT
- parsegnssStData() / stopGnssSelfTest() — GNSS self-test via MON-PT2
- Pass criteria: C/No 42-55 dB-Hz, carrier phase <5deg, RTC freq 32758-32780 Hz
- GPS SVID=20 (ID=0), GLONASS SVID=255 (ID=6, FCN=0)
- MIN_PHASE_LOCK_TIME=2000ms, maxMonPt2Cnt=20U

### 4.6 M9 CFG-VAL Keys
- CFG_RATE_MEAS=0x30210001, CFG_RATE_NAV=0x30210002
- CFG_SIGNAL_GPS_ENA=0x1031001f, GLO=0x10310025, GAL=0x10310021, BDS=0x10310022, NAVIC=0x10310026
- CFG_UART1_BAUDRATE=0x40520001
- CFG_SFODO_IMU2VRP_LA_X/Y/Z=0x30070012/13/14 (lever arm)

### 4.7 Config Files
- u-blox_M8.conf: GEN=8, /dev/ttyHS1, BAUD=230400/9600
- u-blox_M9.conf: GEN=9, adds M9_DEF=38400
- u-blox_imu.conf: IMU 26=BMI330, 27=SMI330 (9.765625us, 4294967295 max ctr)

## 5. NAVSENSORS HAL (connected variants)
### 5.1 Core Files
- common/GnssSourceVIP.cpp/h — GNSS from VIP via IPC
- common/SensorDataReader.cpp/h — IMU from VIP via IPC/FMQ
- common/VipTime.cpp/h — timestamp sync
- common/CCalibration_utils.cpp/h — calibration ID reading
- plugins/calibration/ — Delta-H algorithms
- sensors/aidl/Sensors.cpp/h — Sensors AIDL HAL
- gmlocation/aidl/GmLocationService.cpp/h — GMLocation AIDL

### 5.2 Sensor Handles
- ACC=1, GYRO=2, ACC_UNCAL=3, GYRO_UNCAL=4, GRAVITY=5, LINEAR_ACCEL=6, GYRO_TEMP=7

### 5.3 Calibration Algorithms
- GyroOffsetCalibrator, AccZOffsetCalibrator, AccXYOffset
- VelocityScaleFactorCalibrator, InclHeightEstimator, SpeedAccelEstimator, SensorChecker
- Stored at: /data/vendor/nav/CalibrationValues.txt

### 5.4 Data Structures
- GnssLocationData: statusFlags(32 bits), lat/lon/alt, speed, bearing, accuracies, UTC, fixType
- GnssLocationDataEth: same + bool valid
- PASCDData: $PASCD NMEA — gear, refTime, speeds, sensorType="C"

## 6. FIRMWARE FLASHING
### 6.1 VCU 1.1
- Tools: xPCAT (SoC), flashgui (VIP)
- Order: SAIL -> UFG -> xPCAT -> flashgui
- VIP build: Build.bat -b GlobalB (release), Build.bat -dh Mid (debug)
- u-blox M8L (ADR4.32):
  QNX: swu_bootctrl.out -s mode 2 -> SSH root@192.168.211.100 -> gnss_fw_update_test_app.out
  Manual: ubxfwupdate baud combos 9600:9600:230400 -> 38400:9600:230400 -> 115200:9600:230400
  OTA: swu_bootctrl.out -s mode 2 && -s reason 8 -> reboot -> hamctrl -stop -> Module ID 60

### 6.2 VCU 1.5
- Tools: QPM (USB driver 1.00.89.3), xPCAT, flashgui 8.8
- Order: SAIL -> UFG -> xPCAT -> flashgui 8.8
- CDT FIX: rename contents_prod.xml -> contents.xml (MANDATORY)
- Write-protect fix: disable in QFIL settings
- u-blox M9L (ADR5.2RC02):
  OTA (preferred): swu_bootctrl.out -s mode 2 && -s reason 8 -> Module ID 60, hw_firmware/GNSS/gm_GNSS.img
  QNX recovery: same as VCU 1.1
  Manual: ubxfwupdate with baud combos

### 6.3 Ethernet Switch 88Q5054 (VCU 1.5)
- Manual: adb push 88Q5054_flash.bin /tmp/ -> chmod 777 -> /mnt/usr/bin/Esm_Test_App -f /tmp/88Q5054_flash.bin
- Verify: Esm_Test_App -v -> "v2.09.1000 (2022-05-20)"
- CRC: Esm_Test_App -c -> "5893539d"

### 6.4 Calibration
- SBAT+HWCPN: libpal_diagnostics_testapp menu 16 (HWCPN EXTN 8 bytes, e.g. 0x02250005051a0000)
- Apply: adb push <variant>.override /data/vendor/calibrations/ -> power cycle

## 7. ADB / TARGET COMMANDS
- ADB ETH: setprop service.adb.tcp.port 5555 && stop adbd && start adbd -> adb connect 192.168.222.108:5555
- ADB USB: echo peripheral > /sys/bus/platform/devices/a800000.ssusb/mode + setprop sys.usb.config adb
- TCP server (userdebug): port 42434, adb forward tcp:42434 tcp:42434
- u-blox set baud 115200: echo -e -n hex > /dev/ttyHS1
- Erase+reset: echo -e -n UBX-CFG-CFG erase bytes > /dev/ttyHS1

## 8. LOGGING
- u-blox: setprop persist.log.tag.u-blox V && logcat | grep u-blox
- NavSensors: setprop persist.log.tag.Bosch_NavSensors V
- Hex trace: setprop persist.log.tag.u-blox-hex V + log.counter 1
- NavEvent: setprop persist.log.tag.libNavEvent V
- Frequency: persist.vendor.bosch.hardware.gnss.sensors.log.counter <N> (default 20)

## 9. VTS / CTS
- VTS: vts -m VtsHalGnssTargetTest | VtsHalBoschGnssTargetTest | VtsHalBoschSensorsTargetTest | VtsHalBoschGmLocationTargetTest
- CTS: cts-tf > run cts -m CtsSensorTestCases --skip-preconditions
- NavTest: adb install GMNavTest.apk -> gmlocation-client-1-0
- STR: CANoe panel "network wakeup sleep"

## 10. UNIT TESTS
- u-blox: CUbxThread_Test.cpp, CParser_test.cpp, GmLocationService_Test.cpp
- NavSensors: CCalibration_utils_Test, SensorDataReaderTest, GnssSourceVIP_Test
- Run: gnssUbx_unit-test_linux-x86_64_aborting.sh / navsensors_unit-test_linux-x86_64_aborting.sh
- Coverage: code_coverage.sh / coverageReportGen.sh`

};
