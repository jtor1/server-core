/* tslint:disable */
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetMe
// ====================================================

export interface GetMe_me_aliases {
  __typename: "UserAlias";
  id: string;
  provider: string;
  auth0: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface GetMe_me {
  __typename: "User";
  id: string;
  firstName: string | null;
  lastName: string | null;
  superAdmin: boolean;
  email: string | null;
  aliases: GetMe_me_aliases[];
}

export interface GetMe {
  me: GetMe_me | null;
}

/* tslint:disable */
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: UserFragment
// ====================================================

export interface UserFragment_aliases {
  __typename: "UserAlias";
  id: string;
  provider: string;
  auth0: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface UserFragment {
  __typename: "User";
  id: string;
  firstName: string | null;
  lastName: string | null;
  superAdmin: boolean;
  email: string | null;
  aliases: UserFragment_aliases[];
}

/* tslint:disable */
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

//==============================================================
// END Enums and Input Objects
//==============================================================
