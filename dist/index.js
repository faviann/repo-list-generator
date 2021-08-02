/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 947:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { context, getOctokit } = __nccwpck_require__(934);
const {
  debug,
  info,
  getInput,
  setOutput,
  isDebug,
  startGroup,
  endGroup
} = __nccwpck_require__(198);
const { pluck, zip, unzip, reject } = __nccwpck_require__(231);
const { join } = __nccwpck_require__(622);
const { writeFileSync } = __nccwpck_require__(747);
const _user = getInput('user').split(`/`).shift();
const my_token = getInput('my_token');
const regex = new RegExp(getInput('regex'));
const octokit = new getOctokit(my_token);
const asyncFilter = async (arr, predicate) =>
  Promise.all(arr.map(predicate)).then(results => arr.filter((_v, index) => results[index]));

let checkEmptyRepo = async function (name) {
  debug(`owner: ${_user}`);
  debug(`repo: ${name}`);
  var resp = await octokit.rest.repos.listBranches({
    owner: _user,
    repo: name
  });
  debug(`branches of ${_user}/${name}: ${JSON.stringify(resp.data)}`);
  return JSON.stringify(resp.data) === '[]';
};

let getAll = async function (user, page = 10) {
  try {
    var listFunction = octokit.rest.repos.listForAuthenticatedUser;
    await listFunction();
  } catch (error) {
    if (error.message === 'Resource not accessible by integration') {
      info('[INFO]: This token can not used for listForAuthenticatedUser()');
      listFunction = octokit.rest.repos.listForUser;
    } else {
      debug(`ERROR[listFunction]: ${error}`);
      throw error;
    }
  }
  var repo_list = [];
  for (let i = 1; i < parseInt(page, 10); i++) {
    try {
      let resp = await listFunction({ username: user, page: i, per_page: 100 });
      debug(`Request Header [${i}]:`);
      debug(JSON.stringify(resp.headers));
      repo_list.push.apply(repo_list, resp.data);
      if (!resp.headers.link || resp.headers.link.match(/rel=\\"first\\"/)) break;
    } catch (error) {
      debug(`ERROR[getAll]: [${i}]: ${error}`);
      throw error;
    }
  }
  var repo_info = join('.repo_list', 'repo-info.json');
  debug(`repo-info: ${repo_info}`);
  debug(`regex: ${regex}`);
  if (isDebug()) writeFileSync(repo_info, JSON.stringify(repo_list, null, 2), 'utf-8');
  repo_list = reject(repo_list, item => item.owner.login != user || !item.name.match(regex));
  var repo_list_name = pluck(repo_list, 'name');
  var repo_list_private = pluck(repo_list, 'private');
  var repo_list_fork = pluck(repo_list, 'fork');
  var repo_list_size = pluck(repo_list, 'size');
  info('[INFO]: Successfully get repo data');
  return { repo_list: zip(repo_list_name, repo_list_private, repo_list_fork, repo_list_size) };
};

let getList = async function (repo_list, block_list, allowEmpty = false) {
  debug('repo_list:');
  debug(JSON.stringify(repo_list));
  var repos = repo_list.repo_list;
  repos = reject(repos, item => block_list.includes(item[0]));

  var _emptyList = unzip(reject(repos, item => item[3] > 0))[0] || [];
  debug(`_emptyList[${_emptyList.length}]: ${_emptyList.toString()}`);
  if (_emptyList) var emptyList = await asyncFilter(_emptyList, checkEmptyRepo);
  debug(`emptyList[${emptyList.length}]: ${emptyList.toString()}`);
  setOutput('emptyList', emptyList.toString());

  var repoList = unzip(reject(repos, item => item[1] || item[2]))[0] || [];
  if (!allowEmpty) repoList = reject(repoList, item => emptyList.includes(item));
  setOutput('repoList', repoList.toString());

  var repoList_ALL = unzip(repos)[0] || [];
  if (!allowEmpty) repoList_ALL = reject(repoList_ALL, item => emptyList.includes(item));
  setOutput('repoList_ALL', repoList_ALL.toString());

  var repoList_PRIVATE = unzip(reject(repos, item => item[2]))[0] || [];
  if (!allowEmpty) repoList_PRIVATE = reject(repoList_PRIVATE, item => emptyList.includes(item));
  setOutput('repoList_PRIVATE', repoList_PRIVATE.toString());

  var repoList_FORK = unzip(reject(repos, item => item[1]))[0] || [];
  if (!allowEmpty) repoList_FORK = reject(repoList_FORK, item => emptyList.includes(item));
  setOutput('repoList_FORK', repoList_FORK.toString());

  var privateList = unzip(reject(repos, item => !item[1]))[0] || [];
  if (!allowEmpty) privateList = reject(privateList, item => emptyList.includes(item));
  setOutput('privateList', privateList.toString());

  var forkList = unzip(reject(repos, item => !item[2]))[0] || [];
  if (!allowEmpty) forkList = reject(forkList, item => emptyList.includes(item));
  setOutput('forkList', forkList.toString());

  setOutput('repo', context.repo.repo);
  return {
    repo: context.repo.repo,
    repoList: repoList,
    repoList_ALL: repoList_ALL,
    repoList_PRIVATE: repoList_PRIVATE,
    repoList_FORK: repoList_FORK,
    privateList: privateList,
    forkList: forkList,
    block_list: block_list,
    empty_list: emptyList
  };
};

let printList = async function (repo_name) {
  startGroup(`repo: ${repo_name.repo}`);
  info('[INFO]: repo: The current repository.');
  info(`[INFO]: repo: ${repo_name.repo}`);
  endGroup();
  startGroup(`repoList: ${repo_name.repoList.length}`);
  info('[INFO]: repoList: Repository list exclude private and fork.');
  info('[INFO]: repoList: Public(source without private) and no fork.');
  info(`[INFO]: repoList: ${repo_name.repoList.toString()}`);
  endGroup();
  startGroup(`repoList_ALL: ${repo_name.repoList_ALL.length}`);
  info('[INFO]: repoList_ALL: Repository list include private and fork.');
  info('[INFO]: repoList_ALL: Source(public and private) and fork.');
  info(`[INFO]: repoList_ALL: ${repo_name.repoList_ALL.toString()}`);
  endGroup();
  startGroup(`repoList_PRIVATE: ${repo_name.repoList_PRIVATE.length}`);
  info('[INFO]: repoList_PRIVATE: Repository list include private.');
  info('[INFO]: repoList_PRIVATE: Source(public and private) and no fork.');
  info(`[INFO]: repoList_PRIVATE: ${repo_name.repoList_PRIVATE.toString()}`);
  endGroup();
  startGroup(`repoList_FORK: ${repo_name.repoList_FORK.length}`);
  info('[INFO]: repoList_FORK: Repository list include fork.');
  info('[INFO]: repoList_FORK: Public(source without private) and fork.');
  info(`[INFO]: repoList_FORK: ${repo_name.repoList_FORK.toString()}`);
  endGroup();
  startGroup(`privateList: ${repo_name.privateList.length}`);
  info('[INFO]: privateList: Private repository list.');
  info('[INFO]: privateList: Only private(fork can not be private).');
  info(`[INFO]: privateList: ${repo_name.privateList.toString()}`);
  endGroup();
  startGroup(`forkList: ${repo_name.forkList.length}`);
  info('[INFO]: forkList: Fork repository list.');
  info('[INFO]: forkList: Only fork(private can not be fork).');
  info(`[INFO]: forkList: ${repo_name.forkList.toString()}`);
  endGroup();
  startGroup(`empty_list: ${repo_name.empty_list.length}`);
  info('[INFO]: empty_list: Empty repository list.');
  info('[INFO]: empty_list: Default exclude in each list.');
  info(`[INFO]: empty_list: ${repo_name.empty_list.toString()}`);
  endGroup();
  startGroup(`block_list: ${repo_name.block_list.length}`);
  info('[INFO]: block_list: Repository list that will exclude in each list.');
  info(`[INFO]: block_list: ${repo_name.block_list.toString()}`);
  endGroup();
};

module.exports = { getAll, getList, printList };


/***/ }),

/***/ 352:
/***/ ((module) => {

module.exports = eval("require")("@actions/artifact");


/***/ }),

/***/ 198:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 934:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 274:
/***/ ((module) => {

module.exports = eval("require")("@actions/io");


/***/ }),

/***/ 231:
/***/ ((module) => {

module.exports = eval("require")("underscore");


/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const {
  debug,
  info,
  startGroup,
  endGroup,
  getInput,
  setFailed,
  warning,
  isDebug
} = __nccwpck_require__(198);
const { mkdirP, rmRF } = __nccwpck_require__(274);
const artifact = __nccwpck_require__(352);
const { join } = __nccwpck_require__(622);
const { getAll, getList, printList } = __nccwpck_require__(947);
const { writeFileSync, existsSync } = __nccwpck_require__(747);

async function run() {
  info('[INFO]: Usage https://github.com/yi-Xu-0100/repo-list-generator#readme');
  const repo_list_cache = '.repo_list';
  debug(`repo_list_cache: ${repo_list_cache}`);
  const repos_path = join(repo_list_cache, 'repo-list.json');
  debug(`repos_path: ${repos_path}`);
  const list_path = join(repo_list_cache, 'repo-name.json');
  debug(`list_path: ${list_path}`);
  try {
    startGroup('Get input value');
    const user = getInput('user').split(`/`).shift();
    info(`[INFO]: user: ${user}`);
    const max_page = getInput('max_page');
    info(`[INFO]: max_page: ${max_page}`);
    const block_list = getInput('block_list')
      .split(',')
      .map(item => item.split(`/`).pop());
    info(`[INFO]: block_list: ${block_list}`);
    const allow_empty = getInput('allow_empty').toUpperCase() === 'TRUE' ? true : false;
    info(`[INFO]: allow_empty: ${allow_empty}`);
    info(`[INFO]: isDebug: ${isDebug()}`);
    const regex = getInput('regex');
    info(`[INFO]: regex: ${regex}`);
    if (!existsSync(repo_list_cache) && isDebug()) await mkdirP(repo_list_cache);
    else if (existsSync(repo_list_cache) && isDebug())
      throw Error(`The cache directory(${repo_list_cache}) is occupied!`);
    else if (existsSync(repo_list_cache) && !isDebug())
      warning(
        `The cache directory(${repo_list_cache}) is occupied!\n` +
          'If debug option set to be true, it will be Error!'
      );
    endGroup();

    startGroup('Get repo list');
    var repo_list = await getAll(user, max_page);
    if (isDebug()) writeFileSync(repos_path, JSON.stringify(repo_list, null, 2), 'utf-8');
    var repo_name = await getList(repo_list, block_list, allow_empty);
    endGroup();

    info('[INFO]: Print repo list');
    await printList(repo_name);

    if (isDebug()) writeFileSync(list_path, JSON.stringify(repo_name, null, 2), 'utf-8');
    if (isDebug() && !process.env['LOCAL_DEBUG']) {
      startGroup('Upload repo list debug artifact');
      const artifactClient = artifact.create();
      const artifactName = `repos-${user}-${process.env['GITHUB_ACTION']}`;
      const files = [
        '.repo_list/repo-info.json',
        '.repo_list/repo-list.json',
        '.repo_list/repo-name.json'
      ];
      const rootDirectory = '.repo_list/';
      const options = {
        retentionDays: 1
      };

      await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options);
      await rmRF(repo_list_cache);
      endGroup();
    }
    info('[INFO]: Action successfully completed');
  } catch (error) {
    debug(`ERROR[run]: ${error}`);
    setFailed(error.message);
  }
}

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;