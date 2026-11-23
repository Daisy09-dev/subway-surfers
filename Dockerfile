# Static browser game: no Node.js runtime or build step required.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY src/ /usr/share/nginx/html/src/
COPY vendor/ /usr/share/nginx/html/vendor/
COPY assets/ /usr/share/nginx/html/assets/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
