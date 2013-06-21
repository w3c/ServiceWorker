// set up the controller
if (navigator.registerController) {
  navigator.registerController("/*", "/ctrl.js");

  navigator.addEventListener('controllerreloadpage', function(event) {
    // singlePageApp is just something I made up
    if (singlePageApp.interactedWith) {
      event.waitUntil(new Promise(function(resolver) {
        var updateBanner = new singlePageApp.UpdateBanner();
        updateBanner.okButton.addEventListener('click', resolver.resolve.bind(resolver));
        updateBanner.show();
      }));
    }
  });
}