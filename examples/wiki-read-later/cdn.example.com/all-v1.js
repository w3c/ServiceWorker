// set up the controller
if (navigator.registerController) {
  // TODO: this shouldn't happen until the user takes an article offline
  navigator.registerController("/*", "/ctrl.js");
}