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
    onValidate: (event) => {
        console.log(event)
        if(event.value == "")
        {
            return 'Must be at least 1 character';
        }
    },
    defaultValue: 'This user is a minor making a NSFW post',
    helpText: 'Default: This user is a minor making a NSFW post'
},
{
    type: 'string',
    name: 'commentReportReason',
    label: 'What should the comments reported for this be reported as?',
    onValidate: (event) => {
        console.log(event)
        if(event.value == "")
        {
            return 'Must be at least 1 character';
        }
    },
    defaultValue: 'This user is a minor commenting on a NSFW post',
    helpText: 'Default: This user is a minor commenting on a NSFW post'
},
{
    type: 'string',
    name: 'modnoteText',
    label: 'What should the mod note say?',
    onValidate: (event) => {
        console.log(event)
        if(event.value == "")
        {
            return 'Must be at least 1 character';
        }
    },
    defaultValue: 'This user is a known minor',
    helpText: 'Default: This user is a known minor'
},
{
    type: 'select',
    name: 'modNoteType',
    label: 'What type of mod note?',
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
      },
      {
        label: 'Plain Mod Note',
        value: ''
      }
    ]
},
{
    type: 'boolean',
    name: 'toggleOnOff',
    label: "Toggle the app on/off",
    defaultValue: false,
}
]);

Devvit.addTrigger({
  event: 'PostSubmit', 
  onEvent: async (event, context) => 
  {
      if(await context.settings.get('toggleOnOff'))
      {
        PostChecking(event, context)
      }

  },
});

Devvit.addTrigger({
    event: 'PostUpdate',
    onEvent: async (event, context) =>
    {
        if(await context.settings.get('toggleOnOff'))
        {
            PostChecking(event, context)
        }
    },
});

async function PostChecking(event, context)
{
        if(event.post.nsfw)
        {
            if(CheckIfOnTheList(event.author.name, context))
            {
                const reason = await context.settings.get('postReportReason')
                await context.reddit.report(event.post, {
                    reason: reason,
                });
            }
        } 
}

async function CheckIfOnTheList(key, context)
{
    const { redis } = context;
    const value = await redis.exists(key)
    return (value >= 1)
}

Devvit.addTrigger({
  event: 'CommentSubmit', 
  onEvent: async (event, context) => 
  {
    if(await context.settings.get('toggleOnOff'))
    {

        if(event.post.nsfw)
        {
        
            if(CheckIfOnTheList(event.author.name, context))
            {
                //Not allowed to make this comment
                const reason = await context.settings.get('commentReportReason')
            
                await context.reddit.report(event.comment, {
                    reason: reason,
                });
            }
        
        }
    }
  },
});

Devvit.addMenuItem({
  label: 'Add user to list of users not allowed NSFW',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    if(await context.settings.get('toggleOnOff'))
    {
        const post = await context.reddit.getPostById(context.postId);
        const key = post.authorName;
        const returnValue = await AddToList(key, context)
        AddingToast(returnValue, context, key)
    }
    
  },
});

Devvit.addMenuItem({
  label: 'Remove user from list of users not allowed NSFW',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    if(await context.settings.get('toggleOnOff'))
    {
        const post = await context.reddit.getPostById(context.postId);
        const key = post.authorName;
        const returnValue = await RemoveFromList(key, context)
        RemovalToast(returnValue, context, key)
    }
  },
});

function RemovalToast(returnValue, context, key)
{
    if(returnValue == 0)
    {
       context.ui.showToast('Successfully removed ' + key + ' from the list');
    }
    else if(returnValue == -1)
    {
       context.ui.showToast('Could not remove ' + key + ' from the list, likely already removed');
    }
    else
    {
       context.ui.showToast('Error: Unknown Error');
    }
}

function AddingToast(returnValue, context, key)
{
    if(returnValue == 0)
    {
        context.ui.showToast('Successfully added ' + key + ' from the list');
    }
    else if(returnValue == -1)
    {
        context.ui.showToast('Could not add ' + key + ' from the list, try removing and re-adding to the list');
    }
    else
    {
        context.ui.showToast('Error: Unknown Error');
    }
}

async function RemoveFromList(key, context)
{
    const { redis } = context;
    const subreddit = await context.reddit.getSubredditById(context.subredditId)
    if(await CheckIfOnTheList(key, context))
    {
        try
        {
            const modNote = await redis.hGet(key, 'modnoteID')
            DeleteModNote(modNote, subreddit.name, key, context)
        }
        catch (error)
        {
            const modNote = await redis.get(key)
            DeleteModNote(modNote, subreddit.name, key, context)
        }
        await redis.del(key);
        return 0;
    }
    else
    {
        return -1;
    }
    return -2;
    
}

async function DeleteModNote(modNoteID, subreddit, key, context)
{
    try
    {
        await context.reddit.deleteModNote({
            noteId: modNoteID,
            subreddit: subreddit,
            user: key
        });
    }
    catch
    {
        context.ui.showToast('modnote was not able to be deleted');
    }
        return 0;
}

async function AddToList(key, context)
{
    const { redis } = context;
    if(!await CheckIfOnTheList(key, context))
    {
        const subreddit = await context.reddit.getSubredditById(context.subredditId)
        const labelType = await context.settings.get('modNoteType')
        const modNote = await context.reddit.addModNote({
            redditId: context.commentId, 
            label: labelType.toString(), 
            note: await context.settings.get('modnoteText'), 
            subreddit: subreddit.name, 
            user: key,
        })
        await redis.hSet(key, {modnoteID: modNote.id});
        return 0;
    }
    else
    {
        return -1;
    }
    return -2;
}


Devvit.addMenuItem({
  label: 'Add user to list of users not allowed NSFW',
  location: 'comment',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    if(await context.settings.get('toggleOnOff'))
    {
        const comment = await context.reddit.getCommentById(context.commentId);
        const key = comment.authorName;
        const returnValue = await AddToList(key, context)
        AddingToast(returnValue, context, key)
    }
  },
});

Devvit.addMenuItem({
  label: 'Remove user from list of users not allowed NSFW',
  location: 'comment',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    if(await context.settings.get('toggleOnOff'))
    {
        const comment = await context.reddit.getCommentById(context.commentId);
        const key = comment.authorName;
    
        const returnValue = await RemoveFromList(key, context)
        RemovalToast(returnValue, context, key)
    }
  },
});

export default Devvit;
