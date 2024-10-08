# monster-ui-voip

_***See the `monster-ui` README for local build instructions***_

## For deployment

#### Build the distributed code

(For testing on a staging server, use `voip` instead of `simplevoip`)

- Update the `version` value in `config.js` (e.g., `1.0.2`)

Copy the following directories/files to the `monster-ui/src/apps/simplevoip` directory in the monster-ui repo directory:

```
.circleci/
design/
i18n/
metadata/
style/
submodules/
views/
.shipyard.yml
app.js
config.js
LICENSE
```

##### From your local command line

Navigate to the main app:
```
$ cd /<your-dev-directory>/monster-ui
```

Build the distributed code:
```
$ gulp build-app --app=simplevoip
```

Navigate to the distributed code directory:
```
$ cd dist/apps
```

Build the TAR file (x.x.x is the version from config.js):
```
$ tar -czvf simplevoip-x.x.x.tar.gz simplevoip
```

Move the TAR file out of the repo:
```
$ mv simplevoip-x.x.x.tar.gz /<your-dev-directory>
```

#### To staging

(this will only work if `voip` has been used as the `monster-ui/src/apps` app directory name instead of `simplevoip`)

- Upload the `.tar.gz` file to the `monster-ui-simplevoip` S3 bucket
- Connect to the MonsterUI Staging EC2 instance

##### From the EC2 command line

Execute the bash script to unzip the TAR file and move the files to the appropriate directories:
```
$ ./monsterui.sh
```

Enter version number that matches the uploaded TAR file:
```
Enter the version number in the format #.#.#
```

#### To production

Send the TAR file to 2600hz for addition to the app store