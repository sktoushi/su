function getSecureRandomNumber() {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

function randInt(min, max) {
  return Math.floor(getSecureRandomNumber() * (max - min + 1)) + min;
}

function getRandomIndexByFrequency(frequencyArray) {
    // Calculate the cumulative sum of frequencies
    const cumulativeSum = [];
    let sum = 0;
    for (const freq of frequencyArray) {
        sum += freq;
        cumulativeSum.push(sum);
    }
    // Generate a random number between 0 and the total sum
    const randomNum = Math.floor(getSecureRandomNumber() * sum);
    // Find the index corresponding to the random number
    for (let i = 0; i < cumulativeSum.length; i++) {
        if (randomNum < cumulativeSum[i]) {
            return i;
        }
    }
    // If something goes wrong (unlikely), return a fallback index (e.g., 0)
    return 1;
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function getNumberEquivalent(strChar) {
    let retVal = 0;
    switch (strChar) {
      case 'a': retVal = 1; break;
      case 'b': retVal = 2; break;
      case 'c': retVal = 3; break;
      case 'd': retVal = 4; break;
      case 'e': retVal = 5; break;
      case 'f': retVal = 6; break;
      case 'g': retVal = 7; break;
      case 'h': retVal = 8; break;
      case 'i': retVal = 9; break;
      case 'j': retVal = 10; break;
      case 'k': retVal = 11; break;
      case 'l': retVal = 12; break;
      case 'm': retVal = 13; break;
      case 'n': retVal = 14; break;
      case 'o': retVal = 15; break;
      case 'p': retVal = 16; break;
      case 'q': retVal = 17; break;
      case 'r': retVal = 18; break;
      case 's': retVal = 19; break;
      case 't': retVal = 20; break;
      case 'u': retVal = 21; break;
      case 'v': retVal = 22; break;
      case 'w': retVal = 23; break;
      case 'x': retVal = 24; break;
      case 'y': retVal = 25; break;
      case 'z': retVal = 26; break;
      default:
        break;
    }
    return retVal;
}

function getRandomNumber(uuidString) {
    let uuidWithoutDash = uuidString.replaceAll("-", "");
    var retVal = 0
    for (let i = 1; i <= 32; i++) {
        var ch = uuidWithoutDash.charAt(i - 1);
        if (/^\d+$/.test(ch)) {
            retVal = retVal + Number(ch);
        } else {
            retVal = retVal + Number(getNumberEquivalent(ch));
        }
    }
    return ((retVal * 3485038 * Math.floor(getSecureRandomNumber() * 100)) + (new Date().getFullYear() + (new Date().getMonth() + 1) + new Date().getDay() + new Date().getTime())) % 100;
}
