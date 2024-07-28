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
{
    type: 'string',
    name: 'modnoteText',
    label: 'What should the mod note say?',
},
{
    type: 'select',
    name: 'modNoteType',
    label: 'What type of mod note? (Leaving this blank will make a regular mod note)',
    options: [
      {
        label: 'Abuse Warning',
        value: 'ABUSE_WARNING'
      },
      {
        label: 'Spam Warning',
        value: 'SPAM_WARNING'
      },
      {
        label: 'Spam Watch',
        value: 'SPAM_WATCH'
      },
      {
        label: 'Good Contributor',
        value: 'SOLID_CONTRIBUTOR'
      },
      {
        label: 'Helpful',
        value: 'HELPFUL_USER'
      }
    ]
}
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
    
    const value = await redis.get(post.authorName);
    if(value != post.authorName)
    {
        
    
        const subreddit = await context.reddit.getSubredditById(context.subredditId)
        const labelType = await context.settings.get('modNoteType')
        const modNote = await context.reddit.addModNote({
            redditId: context.postId, 
            label: labelType.toString(), 
            note: await context.settings.get('modnoteText'), 
            subreddit: subreddit.name, 
            user: post.authorName,
        })
        
        await redis.set(key, modNote.id);
        
    }
  },
});

Devvit.addMenuItem({
  label: 'Remove user from list of users not allowed NSFW',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    
    const { redis } = context;
    const subreddit = await context.reddit.getSubredditById(context.subredditId)
    const post = await context.reddit.getPostById(context.postId);
    const key = post.authorName;
    const modNote = await redis.get(key)
    await context.reddit.deleteModNote({
            noteId: modNote,
            subreddit: subreddit.name,
            user: key
        });
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
    const value = await redis.get(comment.authorName);
    if(value != comment.authorName)
    {
        
        const subreddit = await context.reddit.getSubredditById(context.subredditId)
        const labelType = await context.settings.get('modNoteType')
        const modNote = await context.reddit.addModNote({
            redditId: context.commentId, 
            label: labelType.toString(), 
            note: await context.settings.get('modnoteText'), 
            subreddit: subreddit.name, 
            user: comment.authorName,
         })
         await redis.set(key, modNote.id);
    }
  },
});

Devvit.addMenuItem({
  label: 'Remove user from list of users not allowed NSFW',
  location: 'comment',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    
    const { redis } = context;
    const subreddit = await context.reddit.getSubredditById(context.subredditId)
    const comment = await context.reddit.getCommentById(context.commentId);
    const key = comment.authorName;
    const modNote = await redis.get(key)
    await context.reddit.deleteModNote({
            noteId: modNote,
            subreddit: subreddit.name,
            user: key
        });
    await redis.del(key);

  },
});

export default Devvit;
