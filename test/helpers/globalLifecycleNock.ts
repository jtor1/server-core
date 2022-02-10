import nock from 'nock';
import assert from 'assert';

// NOTE:  hard-code it when you need it
const RECORDING = false;


beforeEach(() => {
  if (RECORDING) {
    // https://github.com/nock/nock#recording
    nock.recorder.rec({
      enable_reqheaders_recording: true,
      output_objects: true,
    });

    return;
  }

  // https://github.com/nock/nock#disabling-requests
  //   our Test Suite should never invoke a live external API
  nock.disableNetConnect();

  // for `supertest`
  nock.enableNetConnect("127.0.0.1");
});

afterEach(() => {
  if (RECORDING) {
    // https://github.com/nock/nock#recording
    nock.restore();

    return;
  }

  try {
    // https://github.com/nock/nock#isdone
    //   enforce that all mocks have been called
    //   (nope, you can't get access to the `nock.Scope` itself -- you just get its 'name')
    assert.ok(nock.isDone(), `nock.pendingMocks: ${ JSON.stringify(nock.pendingMocks()) }`);
  }
  finally {
    // https://github.com/nock/nock#enabling-requests
    nock.cleanAll();
    nock.enableNetConnect();
  }
});

afterAll(() => {
  // [Memory leaked when requiring nock](https://github.com/nock/nock/issues/1448)
  nock.restore();
});
