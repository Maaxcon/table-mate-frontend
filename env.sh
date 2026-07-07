#!/bin/sh
mkdir -p /usr/share/nginx/html/app

cat <<EOF > /usr/share/nginx/html/app/env-config.js
window.env = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}",
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "${EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID}",
  VITE_WS_URL: "${VITE_WS_URL}",
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID}",
};
EOF
