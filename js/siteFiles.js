/* jshint worker: true */
/*exports siteFiles */
// We need to get the files for the site
// e.g., find . -type f \( ! -iname ".DS_Store" \) -follow -print|xargs ls -l -1
// Watch for garbage!

(function(exports){
  "use strict";
  const siteFiles = [
    "./",
    "images/code@1x.jpg",
    "images/document.svg",
    "images/github.svg",
    "images/irc.svg",
    "images/link.svg",
    "images/logo.svg",
    "images/twitter_white.svg",
    "images/w3c_white.svg",
    "js/accordion.js",
    "js/lib/async.js",
    "js/lib/cachetasks.js",
    "js/lib/swMessage.js",
    "js/registration.js",
    "js/siteFiles.js",
    "manifest.json",
    "styles/fonts/nexa/Nexa_Bold.otf",
    "styles/style.css",
  ];
  exports.siteFiles = siteFiles;
}(self || window));

