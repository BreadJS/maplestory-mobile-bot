const Jimp = require('jimp')

Jimp.read("screen.png", (err, image) => {
  if (err) throw err;
  image.greyscale().write("read.png");
});