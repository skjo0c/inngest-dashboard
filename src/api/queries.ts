export const GET_APPS = `
  query GetApps {
    apps {
      id
      name
      functions {
        id
        name
        slug
      }
    }
  }
`;

export const GET_RUNS = `
  query GetRuns($first: Int!, $after: String, $filter: RunsFilterV2!) {
    runs(
      first: $first
      after: $after
      orderBy: [{ field: QUEUED_AT, direction: DESC }]
      filter: $filter
    ) {
      edges {
        cursor
        node {
          id
          status
          queuedAt
          startedAt
          endedAt
          eventName
          isBatch
          app { id name }
          function { id name slug }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_RUN_TRACE = `
  query GetRunTrace($runID: String!) {
    runTrace(runID: $runID) {
      ...TraceFields
      childrenSpans {
        ...TraceFields
        childrenSpans {
          ...TraceFields
          childrenSpans {
            ...TraceFields
          }
        }
      }
    }
  }

  fragment TraceFields on RunTraceSpan {
    spanID
    outputID
    name
    status
    stepOp
    stepID
    duration
    queuedAt
    startedAt
    endedAt
    isRoot
    parentSpanID
    stepInfo {
      ... on InvokeStepInfo {
        __typename
        functionID
        runID
        timedOut
      }
      ... on RunStepInfo {
        __typename
        type
      }
    }
  }
`;

export const GET_SPAN_OUTPUT = `
  query GetSpanOutput($outputID: String!) {
    runTraceSpanOutputByID(outputID: $outputID) {
      input
      data
      error {
        message
        name
        stack
      }
    }
  }
`;
