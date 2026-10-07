import { gql } from "@apollo/client"

export const CURRENT_SHIFT_QUERY = gql`
  query CurrentShift {
    currentShift {
      id
      status
      openingFloat
      openedAt
    }
  }
`
