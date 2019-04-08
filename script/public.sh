#!/bin/bash

set -e

yarn build

cd dist
touch .nojekyll

git init
git add .
git commit -m "Updated at $(date)"
git remote add origin git@github.com:whoiscc/butterfly.git
git push -f origin master

cd ..
rm -rf dist
