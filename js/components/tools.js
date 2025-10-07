import Alpine from 'https://unpkg.com/alpinejs@3.13.x/dist/module.esm.js'
import * as midi from '../lib/midi.js'

export const toolsComponent = () => ({
  ccList: [],
  sevenBitNums: [],
  ccNumber: 0,
  supportedManufacturers: ['Yamaha', 'Roland', 'Korg', 'Casio', 'Kawai', 'Kurzweil', 'Alesis', 'Akai', 'Novation', 'Arturia', 'Behringer', 'Boss', 'Dexibell', 'Ensoniq', 'E-MU', 'Gem', 'Kurzweil', 'M-Audio', 'Moog', 'Nord', 'Oberheim', 'PreSonus', 'Sequential', 'Waldorf'],
  selectedManufacturers: 'Yamaha',
  sysExString: 'F0 7E 00 09 03 F7', // General MIDI 2 is On
  ccValue: 0,
  sendOnChange: false,
  activeChannel: 1,

  nrpnNum: 0,
  nrpnValue: 0,
  nrpnNumMsb: 0,
  nrpnNumLsb: 0,
  nrpnValueMsb: 0,
  nrpnValueLsb: -1,

  pcValue: 0,
  bankMsb: 0,
  bankLsb: 0,
  bankNum: 0,

  init() {
    for (let n = 0; n < 128; n++) {
      this.sevenBitNums.push(n)
      this.ccList.push({
        name: midi.ccList[n] ? `${n} - ${midi.ccList[n]}` : n,
        number: n
      })
    }

    this.$watch('ccValue', () => {
      if (this.sendOnChange) {
        this.sendCC()
      }
    })

    this.activeChannel = this.$store.config.channel
  },

  sendCC() {
    // prettier-ignore
    midi.sendCCMessage(
      Alpine.store('config').outputDevice, 
      this.$store.config.channel, 
      this.ccNumber, 
      parseInt(this.ccValue)
    )
  },

  sendSysEx() {
    // prettier-ignore
    midi.sendSysExMessage(
      Alpine.store('config').outputDevice,
      this.$store.config.channel,
      this.sysExString.split(' ').map(b => parseInt(b, 16)),
      // parseInt(this.ccValue)
    );
  },

  interpretSysEx(data) {
    const bytes = data.split(' ').map(b => parseInt(b, 16));

    if (bytes[0] !== 0xF0 || bytes[bytes.length - 1] !== 0xF7) {
      return ['Not a valid SysEx message (should start with F0 and end with F7)']
    }

    let result = [];

    switch (bytes[1]) {
      case 0x7F:
        result.push('Type: Universal Realtime SysEx Message');
        switch (bytes[3]) {
          case 0x04:
            result.push('Category: Device Control');
            switch (bytes[4]) {
              case 0x01:
                result.push('Message: Master Volume Change');
                break;
              case 0x03:
                result.push('Message: Master Fine Tuning');
                break;
              case 0x04:
                result.push('Message: Master Coarse Tuning');
                break;
              case 0x05:
                switch (bytes[9]) {
                  case 0x01:
                    result.push('Message: Global Parameter Control(Reverb Parameter)');
                    switch (bytes[10]) {
                      case 0x00:
                        let s = 'Reverb Type: ';
                        switch (bytes[11]) {
                          case 0x00:
                            s += 'RoomS';
                            break;
                          case 0x01:
                            s += 'RoomM';
                            break;
                          case 0x02:
                            s += 'RoomL';
                            break;
                          case 0x03:
                            s += 'HallM';
                            break;
                          case 0x04:
                            s += 'HallL(default)';
                            break;
                          case 0x08:
                            s += 'GM Plate';
                            break;
                          default:
                            s += `Unknown(${bytes[11]})`;
                            break;
                        }
                        result.push(s);
                        break;
                      case 0x01:
                        result.push(`Reverb Time: ${bytes[11]} (0-127)`);
                        break;
                      default:
                        result.push(`Unknown subcommand: ${bytes[10]}: ${bytes[11]}`);
                        break;
                    }
                    break;
                  case 0x02:
                    result.push('Message: Global Parameter Control(Chorus Parameter)');
                    switch (bytes[10]) {
                      case 0x00:
                        let s = 'Chorus Type: ';
                        switch (bytes[11]) {
                          case 0x00:
                            s += 'GM Chorus1';
                            break;
                          case 0x01:
                            s += 'GM Chorus2';
                            break;
                          case 0x02:
                            s += 'GM Chorus3(default)';
                            break;
                          case 0x03:
                            s += 'GM Chorus4';
                            break;
                          case 0x04:
                            s += 'FB Chorus';
                            break;
                          case 0x05:
                            s += 'GM Flanger';
                            break;
                          default:
                            s += `Unknown(${bytes[11]})`;
                            break;
                        }
                        result.push(s);
                        break;
                      case 0x01:
                        result.push(`Mod Rate: ${bytes[11]} (0-127)`);
                        break;
                      case 0x02:
                        result.push(`Mod Depth: ${bytes[11]} (0-127)`);
                        break;
                      case 0x03:
                        result.push(`Feedback: ${bytes[11]} (0-127)`);
                        break;
                      case 0x04:
                        result.push(`Send to Reverb: ${bytes[11]} (0-127)`);
                        break;
                      default:
                        result.push(`Unknown subcommand: ${bytes[10]}: ${bytes[11]}`);
                        break;
                    }
                    break;
                  default:
                    result.push(`Message: Global Parameter Control(Unknown Parameter: ${bytes[9]})`);
                    break;
                }
                break;
              case 0x06:
                result.push('Message: Global Parameter Control(Chorus Parameter)');
                break;
            }
            break;
          case 0x09:
            result.push('Category: Controller Destination Setting');
            switch (bytes[4]) {
              case 0x01:
                result.push('Message: Channel Pressure (Aftertouch)');
                result.push(`Channel: ${bytes[5]}`);
                switch (bytes[6]) {
                  case 0x00:
                    result.push(`Pitch Control(-24 to 24 semitones): ${bytes[7]}`);
                    break;
                  case 0x01:
                    result.push(`Filter Cutoff Control(-9600...0...+9450 cents): ${bytes[7]}`);
                    break;
                  case 0x02:
                    result.push(`Amplitude Control(-100...0...+100%): ${bytes[7]}`);
                    break;
                  case 0x03:
                    result.push(`LFO Pitch Depth(0 to 127): ${bytes[7]}`);
                    break;
                  case 0x04:
                    result.push(`LFO Filter Depth(0 to 127): ${bytes[7]}`);
                    break;
                  case 0x05:
                    result.push(`LFO Amplitude Depth(0 to 127): ${bytes[7]}`);
                    break;
                  default:
                    result.push(`Unknown Controller: ${bytes[6]} Value: ${bytes[7]}`);
                    break;
                }
                break;
              case 0x03:
                result.push('Controller (Control Change)');
                result.push(`Channel: ${bytes[5]}`);
                result.push(`Controller Number: ${bytes[6]}`);
                switch (bytes[7]) {
                  case 0x00:
                    result.push(`Pitch Control(-24 to 24 semitones): ${bytes[7]}`);
                    break;
                  case 0x01:
                    result.push(`Filter Cutoff Control(-9600...0...+9450 cents): ${bytes[7]}`);
                    break;
                  case 0x02:
                    result.push(`Amplitude Control(-100...0...+100%): ${bytes[7]}`);
                    break;
                  case 0x03:
                    result.push(`LFO Pitch Depth(0 to 127): ${bytes[7]}`);
                    break;
                  case 0x04:
                    result.push(`LFO Filter Depth(0 to 127): ${bytes[7]}`);
                    break;
                  case 0x05:
                    result.push(`LFO Amplitude Depth(0 to 127): ${bytes[7]}`);
                    break;
                  default:
                    result.push(`Unknown Controller: ${bytes[6]} Value: ${bytes[7]}`);
                    break;
                }
                break;
            }
            break;
          case 0x0A:
            result.push('Category: Key-Based Instrument Control');
            result.push(`Channel: ${bytes[5]}`);
            result.push(`Key Number: ${bytes[6]}`);
            switch (bytes[7]) {
              case 0x07:
                result.push(`Volume(-100...0...+100%): ${bytes[8]}`);
                break;
              case 0x0A:
                result.push(`Pan(L63...C...R63): ${bytes[8]}`);
                break;
              case 0x5B:
                result.push(`Reverb Send Level(0-127): ${bytes[8]}`);
                break;
              case 0x5D:
                result.push(`Chorus Send Level(0-127): ${bytes[8]}`);
                break;
              default:
                result.push(`Unknown Controller: ${bytes[7]} Value: ${bytes[8]}`);
                break;
            }
            break;
        }
        break;
      case 0x7E:
        result.push('Type: Universal Non-Realtime SysEx Message');
        switch (bytes[3]) {
          case 0x04:
            result.push('Category: Device Control');
            break;
          case 0x09:
            result.push('Category: General MIDI Message');
            switch (bytes[4]) {
              case 0x01:
                result.push('Message: General MIDI On');
                break;
              case 0x02:
                result.push('Message: General MIDI Off');
                break;
              case 0x03:
                result.push('Message: General MIDI 2 On');
                break;
            }
            break;
          case 0x0A:
            result.push('Category: Key-Based Instrument Control');
            break;
          case 0x08:
            result.push('Category: Scale/Octave Tuning');
            result.push(`Channel/option byte1: ${bytes[5]}`);
            result.push(`Channel byte 2 - bits 0 to 6 = channel 8 to 14: ${bytes[6]} & 0x7F`);
            result.push(`Channel byte 2 - bits 0 to 6 = channel 1 to 7: ${bytes[7] & 0x7F}`);
            result.push(`12 byte tuning offset of 12 semitones from C to B: ${bytes[8]}`);
            break;
          default:
            result.push(`Unknown Category: ${bytes[3]}`);
        }
        break;
      case 0x43:
        result.push('Type: Yamaha Manufacturer SysEx Message(XG)');
        break;
    }

    result.push(`Length: ${bytes.length} bytes`);
    result.push(`Manufacturer ID: ${bytes[1] === 0x7E ? 'Non-realtime (0x7E)' : bytes[1] === 0x7F ? 'Realtime (0x7F)' : bytes[1].toString(16)}`);
    result.push(`Device ID: ${bytes[2]}`);
    result.push(`Model ID: ${bytes[3]}`);
    result.push(`Command ID: ${bytes[4]}`);
    
    return result;
  },

  sendNRPN() {
    midi.sendNRPNMessage(Alpine.store('config').outputDevice, this.$store.config.channel, parseInt(this.nrpnNumMsb), parseInt(this.nrpnNumLsb), parseInt(this.nrpnValueMsb), parseInt(this.nrpnValueLsb))
  },

  sendPC() {
    midi.sendPCMessage(Alpine.store('config').outputDevice, this.$store.config.channel, parseInt(this.pcValue))
  },

  sendBank() {
    midi.sendBankMessage(Alpine.store('config').outputDevice, this.$store.config.channel, parseInt(this.bankMsb), parseInt(this.bankLsb))
    // Also send the PC message, otherwise the bank change won't be reflected (at least on my ASM Hydrasynth!)
    this.sendPC()
  },

  updateNrpnNum() {
    this.nrpnNum = midi.bytePairtoNumber(parseInt(this.nrpnNumMsb), parseInt(this.nrpnNumLsb))
  },

  updateBank() {
    this.bankNum = midi.bytePairtoNumber(parseInt(this.bankMsb), parseInt(this.bankLsb))
  },

  updateNrpnValue() {
    if (this.nrpnValueLsb >= 0) {
      this.nrpnValue = midi.bytePairtoNumber(parseInt(this.nrpnValueMsb), parseInt(this.nrpnValueLsb))
    } else {
      this.nrpnValue = parseInt(this.nrpnValueMsb)
    }
  }
})
