#!/usr/bin/env bash
# Ship the recap videos to the instance.
#
# They are NOT in git: 135MB of mp4 has no business in a source repo, and they
# change on their own cadence rather than with the code. This copies them to
# the path nginx already serves `public/` from, so playback is nginx handling
# range requests off disk rather than Node proxying a 44MB stream.
#
#   scripts/deploy-recaps.sh <ssh-key> <host>
set -euo pipefail
KEY=${1:?ssh key}; HOST=${2:?user@host}
RSH="ssh -i $KEY -o StrictHostKeyChecking=no -o BatchMode=yes"
$RSH "$HOST" "mkdir -p /home/ubuntu/app/public/recaps"
rsync -az -e "$RSH" public/recaps/*.mp4 public/recaps/*.jpg "$HOST":/home/ubuntu/app/public/recaps/
$RSH "$HOST" "ls -la /home/ubuntu/app/public/recaps | tail -n +2 | awk '{printf \"  %-26s %8.1f MB\n\", \$9, \$5/1048576}'"
