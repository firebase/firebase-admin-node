import * as admin from '../../lib/index'
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(chaiAsPromised);

describe('admin.instanceId()', () => {
  it('.deleteInstanceId() fails when called with non-existing instance ID', () => {
    return admin.instanceId().deleteInstanceId('non-existing')
      .should.eventually.be.rejectedWith('Instance ID "non-existing": Failed to find the instance ID.');      
  });
});