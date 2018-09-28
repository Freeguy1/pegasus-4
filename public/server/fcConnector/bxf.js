const SerialPort = require("serialport");
const imufFirmware = require("../firmware/imuf");
let openConnection;

const setupConnection = device => {
  return new Promise((resolve, reject) => {
    const connect = () => {
      console.log("Trying to open port: ", device.comName);
      openConnection.open(openError => {
        if (openError) {
          console.log("OPEN ERROR: ", openError);
          reject(openError);
        } else {
          openConnection.write("!\n", cliError => {
            if (cliError) {
              console.log("couldn't get into cli mode: ", cliError);
              reject(openError);
            } else {
              setTimeout(() => {
                openConnection.read();
                resolve(openConnection);
              }, 200);
            }
          });
        }
      });
    };
    if (!openConnection) {
      console.log("creating new port port: ", device.comName);
      openConnection = new SerialPort(device.comName, {
        baudRate: 115200,
        autoOpen: false
      });
      openConnection.on("error", err => {
        console.log("ERROR: ", err);
        openConnection = undefined;
        reject(err);
      });
      // openConnection.setEncoding('utf8');
      setTimeout(() => connect(), 200);
    } else if (!openConnection.isOpen) {
      console.log("port is not open! ", device.comName);
      connect();
    } else {
      console.log("using open port: ", device.comName);
      resolve(openConnection);
    }
  });
};

const getConfig = device => {
  return sendCommand(device, "config").then(conf => {
    try {
      //trim off " config\n";
      return JSON.parse(conf.slice(conf.indexOf("{"), conf.length - 3));
    } catch (ex) {
      console.log(ex);
      return sendCommand(device, "version").then(version => {
        return { version: version, incompatible: true };
      });
    }
  });
};

const sendCommand = (device, command, waitMs = 200, encode = "utf8") => {
  return new Promise((resolve, reject) => {
    setupConnection(device).then(port => {
      console.log(`sending command: ${command} on port ${device.comName}`);
      port.write(`${command}\n`, err => {
        if (err) {
          console.log("WRITE ERROR: ", err);
          err && reject(err);
        }
      });
      let currentRecBuffer = "";
      let timeout = setInterval(() => {
        let more = port.read();
        if (more) {
          if (encode) {
            let msg = more.toString(encode);
            currentRecBuffer += msg;
          } else {
            currentRecBuffer = more;
          }
        } else {
          timeout && clearInterval(timeout);
          resolve(currentRecBuffer);
        }
      }, waitMs);
    });
  });
};

const updateIMUF = (device, binName, notify) => {
  notify(`Downloading ${binName}...\n`);
  imufFirmware.load(binName, fileBuffer => {
    notify("Communicating with IMU-F...\n");
    let binAsStr = fileBuffer.toString("hex");
    // let binAsStr = fs.readFileSync(path.join(__dirname, './IMUF_1.1.0_STARBUCK_ALPHA.bin')).toString('hex');
    sendCommand(device, "imufbootloader", 5000).then(bootlresp => {
      if (bootlresp.indexOf("BOOTLOADER") > -1) {
        notify("IMU-F ready to talk...\n");
        sendCommand(device, "imufloadbin !").then(prepResp => {
          if (prepResp.indexOf("SUCCESS") > -1) {
            notify(`Loading binary onto IMU-F...\n`);
            let index = 0;
            const sendBytes = () => {
              if (index < binAsStr.length) {
                let tail = Math.min(binAsStr.length, index + 200);
                let sending = `imufloadbin l64000000${binAsStr.slice(
                  index,
                  tail
                )}\n`;
                sendCommand(device, sending, 50).then(() => {
                  notify(".");
                  index = tail;
                  sendBytes();
                });
              } else {
                notify("\nFlashing IMU-F...\n");
                sendCommand(device, "imufflashbin\n", 5000).then(() => {
                  notify("\ndone!\nPlease wait for reboot..\n \n#flyhelio");
                });
              }
            };
            sendBytes();
          }
        });
      }
    });
  });
};

const setValue = (device, name, newVal) => {
  return sendCommand(device, `set ${name}=${newVal}`);
};

const saveEEPROM = device => {
  return sendCommand(device, `msp 250`);
};

let lastTelem;
const getTelemetry = device => {
  return sendCommand(device, `msp 102`, 30, false).then(telem => {
    if (telem) {
      try {
        let data = new DataView(new Uint8Array(telem).buffer, 13);
        lastTelem = {
          telemetry: true,
          acc: {
            x: data.getInt16(0, 1) / 512,
            y: data.getInt16(2, 1) / 512,
            z: data.getInt16(4, 1) / 512
          },
          gyro: {
            x: data.getInt16(6, 1) * (4 / 16.4),
            y: data.getInt16(8, 1) * (4 / 16.4),
            z: data.getInt16(10, 1) * (4 / 16.4)
          },
          mag: {
            x: data.getInt16(12, 1) / 1090,
            y: data.getInt16(14, 1) / 1090,
            z: data.getInt16(16, 1) / 1090
          }
        };
      } catch (ex) {
        console.log(ex);
      }
    }
    return Promise.resolve(lastTelem);
  });
};

module.exports = {
  sendCommand: sendCommand,
  updateIMUF: updateIMUF,
  getConfig: getConfig,
  getTelemetry: getTelemetry,
  setValue: setValue,
  saveEEPROM: saveEEPROM
};
