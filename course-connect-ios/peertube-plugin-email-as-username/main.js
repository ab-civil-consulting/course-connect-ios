async function register({ registerHook, registerClientScript, peertubeHelpers }) {

  // Hook into the user registration process
  registerHook({
    target: 'filter:api.user.register.allowed.result',
    handler: (data, { req }) => {
      const registerBody = req.body;

      // If no username is submitted, use the email address instead
      if (registerBody && !registerBody.username && registerBody.email) {
        req.body.username = registerBody.email;
      }

      return data; // Continue with registration
    }
  });

  // Client script registration to hide username field on web UI
  const clientScriptPath = peertubeHelpers.getRouter().staticUrl('/client/script.js');
  registerClientScript({
    target: 'body',
    path: clientScriptPath
  });
}

async function unregister({ unregisterHook }) {
  // Clean up the hook when the plugin is uninstalled
  unregisterHook({
    target: 'filter:api.user.register.allowed.result'
  });
}

module.exports = {
  register,
  unregister
};
