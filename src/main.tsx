// Visit developers.reddit.com/docs to learn Devvit!

import { Devvit } from '@devvit/public-api';

Devvit.configure({ 
    redis: true,
    redditAPI: true 
});

Devvit.addSettings([
{
    type: 'string',
    name: 'postReportReason',
    label: 'What should the posts reported for this be reported as?',
},
{
    type: 'string',
    name: 'commentReportReason',
    label: 'What should the comments reported for this be reported as?',
},
]);

Devvit.addTrigger({
  event: 'PostSubmit', 
  onEvent: async (event, context) => 
  {
      const { redis } = context;
    if(event.post.nsfw)
    {
        //CHECK IF ON LIST
        const value = await redis.get(event.author.name);
        if(value == event.author.name)
        {
            //Not allowed to make this nsfw post
            const reason = await context.settings.get('postReportReason')
            await context.reddit.report(event.post, {
                reason: reason,
            });
        }
        
    }

  },
});

Devvit.addTrigger({
  event: 'CommentSubmit', 
  onEvent: async (event, context) => 
  {
      const { redis } = context;

    if(event.post.nsfw)
    {
        const value = await redis.get(event.author.name);
        if(value == event.author.name)
        {
            //Not allowed to make this comment
            const reason = await context.settings.get('commentReportReason')
            
            await context.reddit.report(event.comment, {
                reason: reason,
            });
        }
        
    }
  },
});

Devvit.addMenuItem({
  label: 'Add user to list of users not allowed NSFW',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    
    const { redis } = context;
    const post = await context.reddit.getPostById(context.postId);
    const key = post.authorName;
    await redis.set(key, post.authorName);

  },
});

Devvit.addMenuItem({
  label: 'Remove user from list of users not allowed NSFW',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    
    const { redis } = context;
    const post = await context.reddit.getPostById(context.postId);
    const key = post.authorName;
    await redis.del(key);

  },
});

Devvit.addMenuItem({
  label: 'Add user to list of users not allowed NSFW',
  location: 'comment',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    
    const { redis } = context;
    const comment = await context.reddit.getCommentById(context.commentId);
    const key = comment.authorName;
    await redis.set(key, comment.authorName);

  },
});

Devvit.addMenuItem({
  label: 'Remove user from list of users not allowed NSFW',
  location: 'comment',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    
    const { redis } = context;
    const comment = await context.reddit.getCommentById(context.commentId);
    const key = comment.authorName;
    await redis.del(key);

  },
});

export default Devvit;
