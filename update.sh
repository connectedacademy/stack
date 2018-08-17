#!/bin/bash

git pull
cd api/examples/rocket && git pull origin master && cd ../../../
cd app && git pull origin master && npm run build && cd ../
echo "Complete!"
