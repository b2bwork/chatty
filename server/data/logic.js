import { Group, Message, User } from './connectors';

function getAuthenticatedUser(ctx) {
  if (!ctx.user) {
    return Promise.reject('Unauthorized');
  }

  return ctx.user.then((user) => {
    if (!user) {
      return Promise.reject('Unauthorized');
    }

    return user;
  });
}

export const messageLogic = {
  from(message, args, ctx) {
    return message.getUser({ attributes: ['id', 'username'] });
  },
  to(message, args, ctx) {
    return message.getGroup({ attributes: ['id', 'name'] });
  },
  createMessage(_, { text, groupId }, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => user.getGroups({ where: { id: groupId }, attributes: ['id'] })
      .then((group) => {
        if (group) {
          return Message.create({
            userId: user.id,
            text,
            groupId,
          });
        }
        return Promise.reject('Unauthorized');
      }));
  },
};

export const groupLogic = {
  users(group, args, ctx) {
    return group.getUsers({ attributes: ['id', 'username'] });
  },
  messages(group, args, ctx) {
    return Message.findAll({
      where: { groupId: group.id },
      order: [['createdAt', 'DESC']],
      limit: args.limit,
      offset: args.offset,
    });
  },
  query(_, { id }, ctx) {
    return getAuthenticatedUser(ctx).then((user) => {
      return Group.findOne({
        where: { id },
        include: [{
          model: User,
          where: { id: user.id },
        }],
      });
    });
  },
  createGroup(_, { name, userIds }, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => user.getFriends({ where: { id: { $in: userIds } } })
      .then((friends) => {
        return Group.create({
          name,
        }).then((group) => {
          return group.addUsers([ctx.user, ...friends]).then(() => {
            group.users = [ctx.user, ...friends];
            return group;
          });
        });
      }));
  },
  deleteGroup(_, { id }, ctx) {
    return getAuthenticatedUser(ctx).then((user) => {
      return Group.findOne({
        where: { id },
        include: [{
          model: User,
          where: { id: user.id },
        }],
      }).then(group => group.getUsers()
        .then(users => group.removeUsers(users))
        .then(() => Message.destroy({ where: { groupId: group.id } }))
        .then(() => group.destroy()));
    });
  },
  leaveGroup(_, { id }, ctx) {
    return getAuthenticatedUser(ctx).then((user) => {
      if (!user) {
        return Promise.reject('Unauthorized');
      }

      return Group.findOne({
        where: { id },
        include: [{
          model: User,
          where: { id: user.id },
        }],
      }).then((group) => {
        group.removeUser(user.id);
        return { id };
      });
    });
  },
  updateGroup(_, { id, name }, ctx) {
    return getAuthenticatedUser(ctx).then((user) => {
      return Group.findOne({
        where: { id },
        include: [{
          model: User,
          where: { id: user.id },
        }],
      }).then(group => group.update({ name }));
    });
  },
};

export const userLogic = {
  email(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id === user.id) {
        return currentUser.email;
      }

      return Promise.reject('Unauthorized');
    });
  },
  friends(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id !== user.id) {
        return Promise.reject('Unauthorized');
      }

      return user.getFriends({ attributes: ['id', 'username'] });
    });
  },
  groups(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id !== user.id) {
        return Promise.reject('Unauthorized');
      }

      return user.getGroups();
    });
  },
  jwt(user, args, ctx) {
    return Promise.resolve(user.jwt);
  },
  messages(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id !== user.id) {
        return Promise.reject('Unauthorized');
      }

      return Message.findAll({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
      });
    });
  },
  query(_, args, ctx) {
    return getAuthenticatedUser(ctx).then((user) => {
      if (user.id === args.id || user.email === args.email) {
        return ctx.user;
      }

      return Promise.reject('Unauthorized');
    });
  },
};

export const subscriptionLogic = {
  messageAdded(baseParams, args, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => user.getGroups({ where: { id: { $in: [args.groupIds] } }, attributes: ['id'] })
      .then(groups => {
        
      }));
  },
};