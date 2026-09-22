#!/bin/sh
# Builds the plugin and copies it into a vault. Usage: ./deploy.sh [/path/to/vault]
set -e
VAULT="${1:-/Users/maidmor/Documents/pocketcorp-organizer/organizer}"
cd "$(dirname "$0")"
npm run build
DEST="$VAULT/.obsidian/plugins/obsidianize-edit"
mkdir -p "$DEST"
cp main.js manifest.json styles.css "$DEST/"
echo "Installed to $DEST — reload Obsidian (Cmd+R) or toggle the plugin to pick up changes."
