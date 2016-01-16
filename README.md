
# kue-job
Kue job and process manager

## Install   
``` npm install kue-job --save ```

## Usage

``` var jobs = require('kue-job'); ```

Create a new job:

```js
job.create('<job_name>',
  {
    title: '<job title>',
    name: 'foo',
  },
  {
    priority: 'normal',
    attempts: 3,
    onComplete: () => {
      // on complete
    },
    onFailed: () => {
      // on failed
    }
  }
);
```

Process job:  

```js
  jobs.process(SMS_VERIFY_JOB, 1, function* (job) {

    //do your magic

    if (every_thing_is_ok)
      return {'message': 'success'};
    else
      throw new Error('Job failed');
  });
```
