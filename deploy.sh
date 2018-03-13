#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

# From https://gist.github.com/domenic/ec8b0fc8ab45f39403dd

SOURCE_BRANCH="master"

function doCompile {
  chmod 755 ./compile.sh
  ./compile.sh
}

LAST_COMMITER_EMAIL=`git log -1 --pretty=format:'%aE'`
# Pull requests and commits to other branches shouldn't try to deploy, just build to verify
if [ "$TRAVIS_PULL_REQUEST" != "false" -o "$TRAVIS_BRANCH" != "$SOURCE_BRANCH" -o "$LAST_COMMITER_EMAIL" = "plh+deploy@w3.org" ]; then
    echo "Skipping deploy; just doing a build."
    doCompile
    exit 0
fi

# Save some useful information
REPO=`git config remote.origin.url`
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`

# Clone the existing branch for this repo into out/
# Create a new empty branch if gh-pages doesn't exist yet (should only happen on first deply)
git clone $REPO out
cd out

# Run our compile script
doCompile

# Now let's go have some fun with the cloned repo

git config user.name "Travis CI"
git config user.email "$COMMIT_AUTHOR_EMAIL"

# If there are no changes to the compiled out (e.g. this is a README update) then just bail.
if git diff --quiet; then
    echo "No changes to the output on this push; exiting."
    exit 0
fi

# Commit the "changes", i.e. the new version.
# The delta will show diffs between new and old versions.
git add -A .
git commit -m "Building Spec: ${SHA}"

# Get the deploy key by using Travis's stored variables to decrypt deploy_key.enc
ENCRYPTED_KEY_VAR="encrypted_${ENCRYPTION_LABEL}_key"
ENCRYPTED_IV_VAR="encrypted_${ENCRYPTION_LABEL}_iv"
ENCRYPTED_KEY=${!ENCRYPTED_KEY_VAR}
ENCRYPTED_IV=${!ENCRYPTED_IV_VAR}
openssl aes-256-cbc -K $ENCRYPTED_KEY -iv $ENCRYPTED_IV -in ../deploy_key.enc -out ../deploy_key -d
chmod 600 ../deploy_key
eval `ssh-agent -s`
ssh-add ../deploy_key

# Now that we're all set up, we can push.
git push $SSH_REPO 
