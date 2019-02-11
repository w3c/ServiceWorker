#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

INPUT_FILE=$(find . -maxdepth 2 -name "*.bs" -print -quit)

curlretry() {
    curl --retry 2 "$@"
}

curlbikeshed() {
    # The Accept: header ensures we get the error output even when warnings are produced, per
    # https://github.com/whatwg/whatwg.org/issues/227#issuecomment-419969339.
    HTTP_STATUS=$(curlretry https://api.csswg.org/bikeshed/ \
                            --output "$1" \
                            --write-out "%{http_code}" \
                            --header "Accept: text/plain, text/html" \
                            -F die-on=error \
                            -F file=@"$INPUT_FILE" \
                            "${@:2}")

    if [[ "$HTTP_STATUS" != "200" ]]; then
        cat "$1"
        rm -f "$1"
        exit 22
    fi
}

curlbikeshed "index.html"

if [ -d out ]; then
  echo Copy the generated spec into out/index.html
  cp index.html out/index.html
fi
