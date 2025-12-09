import { App } from '../app';

import {
  FirebasePhoneNumberTokenVerifier,
  FpnvToken,
  createFPNTVerifier,
} from './token-verifier';


export abstract class BaseFpnv {
  protected readonly fPNTVerifier: FirebasePhoneNumberTokenVerifier;

  protected constructor(
    app: App,
  ) {
    this.fPNTVerifier = createFPNTVerifier(app);
  }


  public async verifyToken(idToken: string): Promise<FpnvToken> {
    return await this.fPNTVerifier.verifyJWT(idToken);
  }
}
