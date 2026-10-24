# ONLYOFFICE Docs Community with the mobile web editors' edit hooks added (Signofile build).
#
# The official image already ships the mobile editors, but the open-source package ships their edit glue as a stub
# (apps/<editor>/mobile/src/lib/patch.jsx: isSupportEditFeature=false, empty toolbar / context-menu hooks). The Edit and Add
# screens themselves are in the public source. This build compiles the mobile apps from the PUBLIC web-apps tag with
# OUR hook modules (patches/<editor>/patch.jsx) and a small unified patch (patches/common/*.patch: no ONLYOFFICE logo in
# the mobile navbar, a legal notice and source offer in the About page), then overlays only the js bundles on the official
# image. sdkjs, the server and everything else are the official build. No hand edits in a running container.
#
#   docker build -t signofile/documentserver:10.0.0-signofile1 \
#     --build-arg SOURCE_URL=<public repo> .                    # the image
#   docker build --target out --output type=local,dest=./out .   # only the built js (checks)
#   docker build --target out --build-arg PATCHES=stub --build-arg EDITORS="word" ...  # parity check with the unmodified stub
#
# Source offer (AGPL v3 section 13): this directory is the Corresponding Source of the modification; the base is the unmodified
# ONLYOFFICE source at the tag below. See README.md.
ARG DS_IMAGE=onlyoffice/documentserver:10.0.0

FROM node:22-bookworm AS mobile-build
ARG WEBAPPS_TAG=v10.0.0.169
ARG PRODUCT_VERSION=10.0.0
ARG BUILD_NUMBER=169
# appended to the build number in the About page of a modified build ("10.0.0.169-signofile1"); empty for the parity check
ARG BUILD_SUFFIX=""
ARG SOURCE_URL="https://github.com/ilanvinner/signofile-office-editor"
# PATCHES=stub builds the unmodified source (the parity check against the official bundle); PATCHES=ours applies ours
ARG PATCHES=ours
# which mobile editors to build: space separated words of: word cell slide
ARG EDITORS="word"
RUN git clone --depth 1 --branch ${WEBAPPS_TAG} https://github.com/ONLYOFFICE/web-apps.git /web-apps
WORKDIR /web-apps/vendor/framework7-react
RUN npm ci --no-audit --no-fund
COPY patches /patches
RUN if [ "$PATCHES" = "ours" ]; then \
      cd /web-apps && for p in /patches/common/*.patch; do [ -f "$p" ] && git apply --whitespace=nowarn "$p" && echo "applied $p"; done; \
      sed -i "s|SIGNOFILE_SOURCE_URL_PLACEHOLDER|${SOURCE_URL}|g" apps/common/mobile/lib/view/About.jsx; \
      for e in documenteditor spreadsheeteditor presentationeditor; do \
        if [ -f /patches/$e/patch.jsx ]; then cp /patches/$e/patch.jsx /web-apps/apps/$e/mobile/src/lib/patch.jsx; echo "hook module for $e"; fi; \
      done; \
    fi
ENV PRODUCT_VERSION=${PRODUCT_VERSION} NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096
RUN export BUILD_NUMBER="${BUILD_NUMBER}${BUILD_SUFFIX}"; mkdir -p /out; \
    for w in $EDITORS; do \
      case $w in word) e=documenteditor ;; cell) e=spreadsheeteditor ;; slide) e=presentationeditor ;; *) echo "bad editor $w"; exit 1 ;; esac; \
      TARGET_EDITOR=$w node ./build/build.js && mkdir -p /out/$e && cp -a /web-apps/apps/$e/mobile/dist/js /out/$e/js; \
      # the official package prefixes app.js with the copyright banner below (verified byte-for-byte against the 10.0.0 image);
      # it is kept, and a modified build says so
      { printf '/*!\n * Copyright (c) Ascensio System SIA 2009-2026. All rights reserved\n *\n * http://www.onlyoffice.com \n *\n * Version: %s (build:%s)\n' "${PRODUCT_VERSION}" "${BUILD_NUMBER}"; \
        [ "$PATCHES" = "ours" ] && printf ' * Modified by Signofile: mobile edit hooks, no ONLYOFFICE logo in the navbar, legal notice in About\n'; \
        printf ' */\n'; cat /out/$e/js/app.js; } > /tmp/app.js.banner && mv /tmp/app.js.banner /out/$e/js/app.js; \
    done

# --- desktop editors: no ONLYOFFICE logo in the header, a modified-version notice in About ---------------------------------
# The desktop editors of the official image load their shared Header.js / About.js as plain source files (placeholders already
# filled in by the official package). Our unified patch (patches/desktop) is applied to exactly those two files of the official image.
FROM ${DS_IMAGE} AS official
FROM ubuntu:24.04 AS desktop-build
ARG PRODUCT_VERSION=10.0.0
ARG BUILD_NUMBER=169
ARG BUILD_SUFFIX=""
ARG SOURCE_URL="https://github.com/ilanvinner/signofile-office-editor"
RUN apt-get update && apt-get install -y --no-install-recommends patch && rm -rf /var/lib/apt/lists/*
WORKDIR /work
COPY --from=official /var/www/onlyoffice/documentserver/web-apps/apps/common/main/lib/view/Header.js apps/common/main/lib/view/Header.js
COPY --from=official /var/www/onlyoffice/documentserver/web-apps/apps/common/main/lib/view/About.js apps/common/main/lib/view/About.js
COPY patches/desktop /patches-desktop
RUN for p in /patches-desktop/*.patch; do patch -p1 --fuzz=0 < "$p" && echo "applied $p"; done; \
    sed -i "s|SIGNOFILE_VERSION_PLACEHOLDER|${PRODUCT_VERSION}.${BUILD_NUMBER}${BUILD_SUFFIX}|g; s|SIGNOFILE_SOURCE_URL_PLACEHOLDER|${SOURCE_URL}|g" apps/common/main/lib/view/About.js; \
    ! grep -q PLACEHOLDER apps/common/main/lib/view/About.js

FROM scratch AS out
COPY --from=mobile-build /out /

FROM ${DS_IMAGE}
ARG VERSION_SUFFIX=signofile2
ARG SOURCE_URL="https://github.com/ilanvinner/signofile-office-editor"
ARG DS_PATH=/var/www/onlyoffice/documentserver/web-apps/apps
# only the js bundles of the built editors are replaced; stale precompressed copies are removed so no old bundle is served
COPY --from=mobile-build /out /tmp/mobile-out
RUN for d in /tmp/mobile-out/*; do e=$(basename $d); cp -a $d/js/. ${DS_PATH}/$e/mobile/dist/js/ && echo "replaced $e"; done; \
    find ${DS_PATH}/*/mobile/dist/js \( -name '*.gz' -o -name '*.map' \) -delete; \
    chown -R ds:ds ${DS_PATH}/*/mobile/dist/js; rm -rf /tmp/mobile-out; \
    printf '%s\n' "Modified by Signofile (2026-10-23, 2026-10-24): mobile web editors built from the public web-apps source with additional edit hooks; desktop header logo removed; modified-version notice in About. Source: ${SOURCE_URL}" > /var/www/onlyoffice/documentserver/SIGNOFILE-MODIFIED.txt
# the desktop patch: replace the two files, remove their stale precompressed copies (nginx serves a .gz next to the file when it exists)
COPY --from=desktop-build /work/apps/common/main/lib/view/Header.js /work/apps/common/main/lib/view/About.js /tmp/desktop-out/
RUN V=/var/www/onlyoffice/documentserver/web-apps/apps/common/main/lib/view; \
    cp /tmp/desktop-out/Header.js /tmp/desktop-out/About.js $V/ && rm -f $V/Header.js.gz $V/About.js.gz && \
    chown ds:ds $V/Header.js $V/About.js && chmod 444 $V/Header.js $V/About.js && rm -rf /tmp/desktop-out && \
    printf '%s\n' "Desktop editors: the ONLYOFFICE logo is not shown in the editor header (2026-10-24); About says this is a modified version and links the source." >> /var/www/onlyoffice/documentserver/SIGNOFILE-MODIFIED.txt
LABEL org.opencontainers.image.title="ONLYOFFICE Docs Community (Signofile modified editors)" \
      org.opencontainers.image.version="10.0.0-${VERSION_SUFFIX}" \
      org.opencontainers.image.description="Official ONLYOFFICE Docs Community with the mobile web editors rebuilt from public source with edit hooks added, and no ONLYOFFICE logo in the desktop editor header. Modified version; AGPL v3."
