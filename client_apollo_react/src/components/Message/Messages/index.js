import React, { Component, Fragment } from 'react';
import { Query } from 'react-apollo';
import gql from 'graphql-tag';

import MessageDelete from '../MessageDelete';
import Loading from '../../Loading';
import withSession from '../../Session/withSession';

const MESSAGE_CREATED = gql`
  subscription {
    messageCreated {
      message {
        id
        text
        createdAt
        user {
          id
          username
        }
      }
    }
  }
`;

const GET_PAGINATED_MESSAGES_WITH_USERS = gql`
  query($cursor: String, $limit: Int!) {
    messages(cursor: $cursor, limit: $limit)
      @connection(key: "MessagesConnection") {
      edges {
        id
        text
        createdAt
        user {
          id
          username
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

//-----------------------------------------------------------
//                    Inline Styles
//-----------------------------------------------------------
const messageItemStyles = {
  border: ' 2px solid black', 
  color: 'black',
  marginBottom: '1px',
  width: '50%', 
};
const messageTextStyles = {
  wordBreak: 'break-all', 
  wordWrap: 'break-word',
  position: 'relative', 
}
//-----------------------------------------------------------

const Messages = ({ limit }) => (
  <Query
    query={GET_PAGINATED_MESSAGES_WITH_USERS}
    variables={{ limit }}
  > 
    {({ data, loading, error, fetchMore, subscribeToMore }) => {
      if (!data) {
        return (
          <div>
            There are no messages ...
          </div>
        );
      }

      const { messages } = data;

      if (loading || !messages) {
        return <Loading />;
      }

      const { edges, pageInfo } = messages;

      return (
        <Fragment>
          <MessageList
            messages={edges}
            subscribeToMore={subscribeToMore}
          />

          {pageInfo.hasNextPage && (
            <MoreMessagesButton
              limit={limit}
              pageInfo={pageInfo}
              fetchMore={fetchMore}
            >
              More
            </MoreMessagesButton>
          )}
        </Fragment>
      );
    }}
  </Query>
);

const MoreMessagesButton = ({
  limit,
  pageInfo,
  fetchMore,
  children,
}) => (
  <button
    type="button"
    onClick={() =>
      fetchMore({
        variables: {
          cursor: pageInfo.endCursor,
          limit,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return previousResult;
          }

          return {
            messages: {
              ...fetchMoreResult.messages,
              edges: [
                ...previousResult.messages.edges,
                ...fetchMoreResult.messages.edges,
              ],
            },
          };
        },
      })
    }
  >
    {children}
  </button>
);

class MessageList extends Component {
  subscribeToMoreMessage = () => {
    this.props.subscribeToMore({
      document: MESSAGE_CREATED,
      updateQuery: (previousResult, { subscriptionData }) => {
        if (!subscriptionData.data) {
          return previousResult;
        }

        const { messageCreated } = subscriptionData.data;

        return {
          ...previousResult,
          messages: {
            ...previousResult.messages,
            edges: [
              messageCreated.message,
              ...previousResult.messages.edges,
            ],
          },
        };
      },
    });
  };

  componentDidMount() {
    this.subscribeToMoreMessage();
  }

  render() {
    const { messages } = this.props;

    return messages.map(message => (
      <MessageItem 
        key={message.id} 
        message={message} 
      />
    ));
  }
}
//-----------------------------------------------------------
//                Individual Message Items 
//-----------------------------------------------------------
const MessageItemBase = ({ message, session }) => (
  <div style={messageItemStyles}> 
    <h2>Username: {message.user.username}</h2>
    <p><h4>Date: {message.createdAt}</h4></p>
    <p style={messageTextStyles}>
      <h4 style={{textDecoration: 'underline'}}>
        Message:
      </h4> 
      {message.text}
    </p>

    {session &&
      session.me &&
      message.user.id === session.me.id && (
        <MessageDelete message={message} />
      )}
  </div>
);
//-----------------------------------------------------------

const MessageItem = withSession(MessageItemBase);

export default Messages;
