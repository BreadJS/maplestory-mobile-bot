const getPixels = require('get-pixels');
const exec = require('await-exec');
const chalk = require('chalk');
const readline = require('readline');
const tesseract = require('node-tesseract');
const Jimp = require('jimp');

const Core = require('./Core.js');

// Current state
let current_state = "idle";
let completed = 0;
let goingText = false;
let sessionXP = 0;
let sessionMesos = 0;

// Positions
const x_accept = 1520; // x
const y_accept = 625; // x
const x_firstQuest = 135;
const y_firstQuest = 360;
const x_skipText = 1814; // x
const y_skipText = 751; // x
const x_reward = 800; // x
const y_reward = 960; // x
const x_crossWhite = 1836; // x
const y_crossWhite = 69; // x
const x_sp = 1100; // x
const y_sp = 530; // x
const x_other = 590;
const y_other = 939;

// Colors
const r_accept = 238;
const g_accept = 112;
const b_accept = 70;

let pixelsGlobal;

// Number with commas
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get screen from android device
async function getScreen() {
  await exec(`adb exec-out screencap -p > screen.png`);
  await getPixels('screen.png', async function(err, pixels) {
    if(err) {
      Core.Log(chalk.yellow, "getColor", "Small image problem, not that big of a deal");
      return;
    }
    pixelsGlobal = pixels;
  });
  return;
}

// Get color from image position
async function getColor(x, y) {
  await sleep(500);

  let r,g,b;
  r = pixelsGlobal.get(x, y, 0);
  g = pixelsGlobal.get(x, y, 1);
  b = pixelsGlobal.get(x, y, 2);

  await sleep(500);

  return {r:r,g:g,b:b};
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', async (key, data) => {
  if (data.name === 'e') {
    process.exit();
  } else if (data.name === 's') {
    current_state = "in_quest";
    await exec(`adb shell input tap ${x_firstQuest} ${y_firstQuest}`);
    Core.Log(chalk.cyan, 'In quest', `[${completed} Completed] Quest has started!`);
  } else if (data.name === 'i') {
    current_state = "in_quest";
    Core.Log(chalk.cyan, 'In quest', `[${completed} Completed] Checking current status of quest...`);
  } else if(data.name === 'h') {
    Core.Log(chalk.gray, 'Actions', ` e = Exit | s = Start Quest | i = In Quest`);
  }
});

(async () => {
  // Clear the screen
  console.clear();

  // Automation
  setInterval(async () => {
    if(current_state == "idle") {
      Core.Log(chalk.blue, "Idle", "    [" + completed + " Completed] Nothing is happening");
    } else if(current_state == "in_quest") {
      await getScreen();

      let colorCross = await getColor(x_crossWhite, y_crossWhite);
      let colorButton = await getColor(x_accept, y_accept);
      // If white cross is there 
      if(colorCross.r == 255 && colorCross.g == 255 && colorCross.b == 255) {
        // If button is there
        if(colorButton.r == r_accept && colorButton.g == g_accept && colorButton.b == b_accept) {  
          // Click accept button
          Core.Log(chalk.red, "Button", "  [" + completed + " Completed] Clicked accept/complete button");
          await exec(`adb shell input tap ${x_accept} ${y_accept}`);
        } else {
          // If no accept button then skip text
          Core.Log(chalk.magenta, "Skipping", "[" + completed + " Completed] Skipping text...");
          await exec(`adb shell input tap ${x_skipText} ${y_skipText}`);
          await exec(`adb shell input tap ${x_skipText} ${y_skipText}`);
          await exec(`adb shell input tap ${x_skipText} ${y_skipText}`);
        }
      } else {
        let colorReward = await getColor(x_reward, y_reward);
        if(colorReward.r == r_accept && colorReward.g == g_accept && colorReward.b == b_accept) {  
          current_state = "new_quest";
          completed++;
          Core.Log(chalk.green, "Reward", "  [" + completed + " Completed] Claiming rewards!");
          await exec(`adb shell input tap ${x_reward} ${y_reward}`);
          
          /*try {
            await exec(`convert screen.png -colorspace Gray read.png`);
            await exec(`convert -brightness-contrast -25x40 read.png read.png`);
          } catch (e) {
            Core.Log(chalk.red, "Error", "   [" + completed + " Completed] Something went wrong when converting image to grayscale")
          }
          tesseract.process('./read.png',function(err, text) {
            if(err) {
              console.error(err);
            } else {
              array = text.split('\n');
              sessionXP += parseInt(array[array.indexOf('EXP')+1].replace(/[^0-9]/g, ""));
              sessionMesos += parseInt(array[array.indexOf('Red Mesos')+1].replace(/[^0-9]/g, ""));
              Core.Log(chalk.green, "Session", " [" + completed + " Completed] [" + numberWithCommas(sessionXP) + " EXP] [" + numberWithCommas(sessionMesos) + " Mesos]");
            }
          });*/
        } else {
          let colorAssign = await getColor(x_sp, y_sp);
          if(colorAssign.r == 188 && colorAssign.g == 60 && colorAssign.b == 87) {
            await exec(`adb shell input tap ${x_sp} ${y_sp}`);
            Core.Log(chalk.green, "SP", "      [" + completed + " Completed] Assign SP points");
          } else {
            let otherQuest = await getColor(x_other, y_other);
            if(otherQuest.r == r_accept && otherQuest.g == g_accept && otherQuest.b == b_accept || otherQuest.r == 89 && otherQuest.g == 176 && otherQuest.b == 168) {
              await exec(`adb shell input tap ${x_other} ${y_other}`);
              Core.Log(chalk.cyan, "In quest", "[" + completed + " Completed] Assigned a quest");
            } else {
              if(goingText == false) {
                Core.Log(chalk.cyan, "In quest", "[" + completed + " Completed] Quest is still going...");
                goingText = true;
              }
            }
          }
        }
      }
    } else if(current_state == "new_quest") {
      Core.Log(chalk.cyan, "In quest", "[" + completed + " Completed] New quest started!");
      current_state = "in_quest";
      goingText = false;
      await sleep(3000);
      await exec(`adb shell input tap ${x_firstQuest} ${y_firstQuest}`);
    }
  }, 4000);
})()