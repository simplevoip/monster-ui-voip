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

### Build an RPM
```
# 1) pull latest version of app from git repo
#---------------------------------------------
$ cd /opt/monster-ui/{dev|prod}/src/apps/simplevoip
$ git pull

# 2) create a directory for the new version of the app
#---------------------------------------------
$ mkdir ~/tmp/simplevoip-{version}

# 3) copy required files for the RPM build (source files, license, and spec)
#---------------------------------------------
$ cp -a /opt/monster-ui/{dev|prod}/src/apps/simplevoip/. ~/tmp/simplevoip-{version}/
$ cp /opt/monster-ui/{dev|prod}/src/apps/simplevoip/LICENSE ~/tmp/simplevoip-{version}/
$ cp /opt/monster-ui/{dev|prod}/src/apps/simplevoip/simplevoip.spec ~/rpmbuild/SPECS/

# 4) build a tarball of the source files and license
#---------------------------------------------
$ cd ~/tmp/
$ tar -cvzf simplevoip-{version}.tar.gz simplevoip-{version}

# 5) move the tarball into the RPM build directory
#---------------------------------------------
$ mv ~/tmp/simplevoip-{version}.tar.gz ~/rpmbuild/SOURCES/

# 6) build the RPM using the spec file
# this process eats the spec file,
# so you'll need to copy the spec file (see above)
# over again in order to rebuild
#---------------------------------------------
$ rpmbuild -bs ~/rpmbuild/SPECS/simplevoip.spec
```

_***See the `monster-ui` README for local build instructions***_