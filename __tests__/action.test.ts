import * as core from '@actions/core';
import nock from 'nock';
import fs from 'fs';
import path from 'path';
import action from '../src/action';
import { Context } from '@actions/github/lib/context';
import { WebhookPayload } from '@actions/github/lib/interfaces';

nock.disableNetConnect();

describe('pr-labeler-action', () => {
  describe("requireLabeling is 'false'", () => {
    beforeEach(() => {
      setupEnvironmentVariables("false");
    });

    it('adds the "fix" label for "fix/510-logging" branch', async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=fix%2F510-logging')
        .reply(200, configFixture())
        .post('/repos/Codertocat/Hello-World/issues/1/labels', (body) => {
          expect(body).toMatchObject({
            labels: ['fix'],
          });
          return true;
        })
        .reply(200);

      await action(new MockContext(pullRequestOpenedFixture({ ref: 'fix/510-logging' })));
      expect.assertions(1);
    });

    it('adds the "feature" label for "feature/sign-in-page/101" branch', async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=feature%2Fsign-in-page%2F101')
        .reply(200, configFixture())
        .post('/repos/Codertocat/Hello-World/issues/1/labels', (body) => {
          expect(body).toMatchObject({
            labels: ['🎉 feature'],
          });
          return true;
        })
        .reply(200);

      await action(new MockContext(pullRequestOpenedFixture({ ref: 'feature/sign-in-page/101' })));
      expect.assertions(1);
    });

    it('adds the "release" label for "release/2.0" branch', async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=release%2F2.0')
        .reply(200, configFixture())
        .post('/repos/Codertocat/Hello-World/issues/1/labels', (body) => {
          expect(body).toMatchObject({
            labels: ['release'],
          });
          return true;
        })
        .reply(200);
  
      await action(new MockContext(pullRequestOpenedFixture({ ref: 'release/2.0' })));
      expect.assertions(1);
    });

    it('uses the default config when no config was provided', async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=fix%2F510-logging')
        .reply(404)
        .post('/repos/Codertocat/Hello-World/issues/1/labels', (body) => {
          expect(body).toMatchObject({
            labels: ['fix'],
          });
          return true;
        })
        .reply(200);

      await action(new MockContext(pullRequestOpenedFixture({ ref: 'fix/510-logging' })));
      expect.assertions(1);
    });

    it('adds only one label if the branch matches a negative pattern', async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=release%2Fskip-this-one')
        .reply(200, configFixture())
        .post('/repos/Codertocat/Hello-World/issues/1/labels', (body) => {
          expect(body).toMatchObject({
            labels: ['skip-release'],
          });
          return true;
        })
        .reply(200);

      await action(new MockContext(pullRequestOpenedFixture({ ref: 'release/skip-this-one' })));
      expect.assertions(1);
    });

    it("adds no labels if the branch doesn't match any patterns", async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=hello_world')
        .reply(200, configFixture())
        .post('/repos/Codertocat/Hello-World/issues/1/labels', (body) => {
          throw new Error("Shouldn't edit labels");
        })
        .reply(200);

      await action(new MockContext(pullRequestOpenedFixture({ ref: 'hello_world' })));
    });
  });
  describe("requireLabeling is 'true'", () => {
    const spy = jest.spyOn(core, 'setFailed');
    beforeEach(() => {
      setupEnvironmentVariables("true");
    });
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("fail if none of expected labels is assigned AND requireLabeling is 'true'", async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=require_labeling')
        .reply(200, configFixture())
        .get('/repos/Codertocat/Hello-World/issues/1/labels')
        .reply(200, pullRequestLabelsFixture('require_labeling')); // not expected label

      await action(new MockContext(pullRequestOpenedFixture({ ref: 'require_labeling' })));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("no label is added but the result is success", async () => {
      nock('https://api.github.com')
        .get('/repos/Codertocat/Hello-World/contents/.github/pr-labeler.yml?ref=require_labeling')
        .reply(200, configFixture())
        .get('/repos/Codertocat/Hello-World/issues/1/labels')
        .reply(200, pullRequestLabelsFixture('fix')); // one of expected labels is manually assigned

      await action(new MockContext(pullRequestOpenedFixture({ ref: 'require_labeling' })));
      expect(spy).toHaveBeenCalledTimes(0);
    });
  });
});

class MockContext extends Context {
  constructor(payload: WebhookPayload) {
    super();
    this.payload = payload;
  }
}

function encodeContent(content: Buffer) {
  return Buffer.from(content).toString('base64');
}

function configFixture(fileName = 'config.yml') {
  return {
    type: 'file',
    encoding: 'base64',
    size: 5362,
    name: fileName,
    path: `.github/${fileName}`,
    content: encodeContent(fs.readFileSync(path.join(__dirname, `fixtures/${fileName}`))),
    sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
    url: 'https://api.github.com/repos/octokit/octokit.rb/contents/.github/release-drafter.yml',
    git_url: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
    html_url: 'https://github.com/octokit/octokit.rb/blob/master/.github/release-drafter.yml',
    download_url: 'https://raw.githubusercontent.com/octokit/octokit.rb/master/.github/release-drafter.yml',
    _links: {
      git: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
      self: 'https://api.github.com/repos/octokit/octokit.rb/contents/.github/release-drafter.yml',
      html: 'https://github.com/octokit/octokit.rb/blob/master/.github/release-drafter.yml',
    },
  };
}

function pullRequestOpenedFixture({ ref }: { ref: string }) {
  return {
    pull_request: {
      number: 1,
      head: {
        ref,
      },
    },
    repository: {
      name: 'Hello-World',
      owner: {
        login: 'Codertocat',
      },
    },
  };
}

function pullRequestLabelsFixture(labelName: string) {
  // https://docs.github.com/ja/rest/issues/labels#list-labels-for-an-issue
  return [
    {
      "id": 208045946,
      "node_id": "MDU6TGFiZWwyMDgwNDU5NDY=",
      "url": "https://api.github.com/repos/octocat/Hello-World/labels/bug",
      "name": labelName,
      "description": "Something isn't working",
      "color": "f29513",
      "default": true
    }
  ];
}


function setupEnvironmentVariables(requireLabeling: string) {
  // reset process.env otherwise `Context` will use those variables
  process.env = {};

  // configuration-path parameter is required
  // parameters are exposed as environment variables: https://help.github.com/en/github/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions#jobsjob_idstepswith
  process.env['INPUT_CONFIGURATION-PATH'] = '.github/pr-labeler.yml';
  process.env['INPUT_REQUIRE-LABELING'] = requireLabeling;
}
