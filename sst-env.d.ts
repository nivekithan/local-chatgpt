/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    LocalChatGptKey: {
      type: "sst.sst.Secret"
      value: string
    }
    OAuthGoogleClientId: {
      type: "sst.sst.Secret"
      value: string
    }
    OAuthGoogleClientSecret: {
      type: "sst.sst.Secret"
      value: string
    }
    OAuthRedirectUri: {
      type: "sst.sst.Secret"
      value: string
    }
    PostgresConnectionUrl: {
      type: "sst.sst.Secret"
      value: string
    }
    ReplicacheLicenseKey: {
      type: "sst.sst.Secret"
      value: string
    }
    SessionSecret: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}