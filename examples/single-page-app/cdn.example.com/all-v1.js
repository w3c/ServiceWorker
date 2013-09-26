// set up the controller
if (navigator.registerServiceWorker) {
  navigator.registerServiceWorker("/*", "/ctrl.js");

  navigator.addEventListener('serviceworkerreloadpage', function(event) {
    // singlePageApp is just something I made up
    if (singlePageApp.interactedWith) {
      event.waitUntil(new Promise(function(resolve, reject) {
        var updateBanner = new singlePageApp.UpdateBanner();
        updateBanner.okButton.addEventListener('click', resolve);
        updateBanner.show();
      }));
    }
  });
}