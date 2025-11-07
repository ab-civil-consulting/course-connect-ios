# PeerTube Plugin: Email as Username

This plugin simplifies the PeerTube registration process by automatically using the user's email address as their username, eliminating the need for users to create a separate username.

## Overview

**What it does:**
- Automatically assigns the user's email address as their username during registration
- Hides the username field from the registration form on the PeerTube web interface
- Works seamlessly with the MC Assist mobile app

**Why it's needed:**
PeerTube requires a unique username for every user, but for mobile applications, this creates unnecessary friction in the registration process. This plugin solves that by handling the username requirement behind the scenes.

## Features

### Server-Side Hook
- Intercepts registration API calls
- Automatically populates the username field with the email address if username is not provided
- Ensures compatibility with PeerTube's existing authentication system

### Client-Side Script
- Hides the username input field on the PeerTube web signup page
- Uses a MutationObserver to handle PeerTube's dynamic UI
- Maintains consistency between mobile app and web interface

## Installation

### Prerequisites
- PeerTube version 6.0.0 or higher
- Access to your PeerTube server filesystem
- Root or sudo access to restart PeerTube

### Installation Steps

1. **Copy the plugin to your PeerTube server**

   Upload the entire `peertube-plugin-email-as-username` folder to your PeerTube server. You can place it temporarily anywhere accessible.

2. **Move the plugin to the PeerTube plugins directory**

   ```bash
   # Navigate to your PeerTube installation directory
   cd /var/www/peertube

   # Create the plugins directory if it doesn't exist
   mkdir -p plugins

   # Copy the plugin folder
   cp -r /path/to/peertube-plugin-email-as-username ./plugins/
   ```

3. **Install the plugin dependencies**

   ```bash
   # From the PeerTube root directory
   cd /var/www/peertube
   npm install ./plugins/peertube-plugin-email-as-username
   ```

4. **Restart PeerTube**

   The restart method depends on how you're running PeerTube:

   **If using systemd:**
   ```bash
   sudo systemctl restart peertube
   ```

   **If using pm2:**
   ```bash
   pm2 restart peertube
   ```

   **If using Docker:**
   ```bash
   docker-compose restart peertube
   ```

5. **Enable the plugin (if needed)**

   - Log in to your PeerTube instance as an administrator
   - Navigate to Administration → Plugins/Themes
   - Find "peertube-plugin-email-as-username" in the list
   - Click "Enable" if it's not already enabled

## Verification

To verify the plugin is working correctly:

1. **Test the Web Interface:**
   - Navigate to your PeerTube instance's signup page (`https://your-instance.com/signup`)
   - You should only see Email, Password, and Confirm Password fields
   - The Username field should be hidden

2. **Test Registration:**
   - Complete a test registration with just email and password
   - Check the user list in Administration → Users
   - The new user's username should match their email address

3. **Test Mobile App Registration:**
   - Open the MC Assist mobile app
   - Navigate to the signup screen
   - Register with just email and password
   - Verify you can sign in with your email

## How It Works

### Registration Flow

1. User submits registration form (mobile app or web) with email and password
2. Plugin intercepts the registration API call via `filter:api.user.register.allowed.result` hook
3. If no username is provided in the request, the plugin automatically sets `username = email`
4. PeerTube processes the registration normally with email as username
5. User can now sign in using their email address

### Client-Side Hiding (Web Only)

The client-side script only affects the PeerTube web interface:
- Runs only on the `/signup` page
- Uses a MutationObserver to detect when the username field is added to the DOM
- Hides the username field's form group via CSS (`display: none`)
- Does not affect the mobile app (which has its own simplified UI)

## Compatibility

- **PeerTube:** Version 6.0.0 or higher
- **Mobile App:** MC Assist (modified OwnTube.tv fork)
- **Browsers:** All modern browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Plugin not appearing in PeerTube admin panel

- Verify the plugin is in the correct directory: `/var/www/peertube/plugins/`
- Check that package.json has the correct "engine" field
- Restart PeerTube and check the logs: `sudo journalctl -u peertube -f`

### Username field still visible on web

- Clear your browser cache
- Check browser console for JavaScript errors
- Verify the client script path in main.js matches your PeerTube configuration

### Registration fails with "username required" error

- Check PeerTube logs for hook execution
- Verify the hook target name matches your PeerTube version
- Test with explicit username in API call to isolate the issue

### Users can't sign in after registration

- Verify that the username in the database matches the email
- Check that PeerTube's authentication accepts email as username
- Test sign-in with both email and the stored username

## Uninstallation

To remove the plugin:

1. Disable the plugin in PeerTube admin panel
2. Remove the plugin directory:
   ```bash
   rm -rf /var/www/peertube/plugins/peertube-plugin-email-as-username
   ```
3. Restart PeerTube

**Note:** Users created with this plugin will retain their email as username. They can continue to sign in normally.

## File Structure

```
peertube-plugin-email-as-username/
├── package.json          # Plugin metadata and dependencies
├── main.js              # Server-side hook logic
├── client/
│   └── script.js        # Client-side UI hiding script
└── README.md            # This file
```

## Support

For issues related to:
- **Plugin functionality:** Check PeerTube plugin documentation
- **MC Assist mobile app:** Contact the app development team
- **PeerTube core:** Visit https://github.com/Chocobozzz/PeerTube

## License

This plugin follows the same license as the MC Assist project.
