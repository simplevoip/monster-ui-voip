# monster-ui-voip

This is a sub application of [2600hz/monster-ui](https://github.com/2600hz/monster-ui).

Users should clone into `/monster-ui/src/apps/` such as:
```
$ cd monster-ui/src/apps/
$ git clone https://github.com/2600hz/monster-ui-voip.git voip
```
Then the gulp workflow for 2600hz/monster-ui applies.

```
# development
$ cd /opt/monster-ui/dev
# production
$ cd /opt/monster-ui/prod

$ git pull
$ cd src/apps/voip
$ git pull
$ cd ../../..

$ gulp build-app --app=voip
$ gulp build-prod
```

_***See the `monster-ui` README for local build instructions***_