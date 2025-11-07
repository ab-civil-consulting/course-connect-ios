(function() {
  // We only want this script to run on the signup page
  if (window.location.pathname.includes('/signup')) {

    // This function finds and hides the username form group
    const hideUsernameField = () => {
      const usernameInput = document.querySelector('input[name="username"]');
      if (usernameInput) {
        const formGroup = usernameInput.closest('.form-group');
        if (formGroup) {
          formGroup.style.display = 'none';
        }
      }
    };

    // PeerTube's UI is dynamic, so we use a MutationObserver to
    // ensure the field is hidden as soon as it's added to the page.
    const observer = new MutationObserver((mutations) => {
      if (document.querySelector('input[name="username"]')) {
        hideUsernameField();
        observer.disconnect(); // Stop observing once we've hidden the field
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
