var co = require('co')
var kue = require ('kue')
var queue = kue.createQueue()

module.exports = {
  kue: kue,
  queue: queue,
  create: createJob,
  process: processJob
}

/**
 * Remove complete jobs, even when they failed
 */
queue
.on('job complete', function (id) {
  kue.Job.get(id, function (err, job) {
    if (err) return
    job.remove(function (err) {
      if (err)
        console.error(err)
    })
  })
})
.on('error', function (err) {
  console.error(err);
})

/*
 * Kue currently uses client side job state management and when redis crashes
 * in the middle of that operations, some stuck jobs or index inconsistencies
 * will happen. If you are facing poor redis connections or an unstable redis
 * service you can start Kue's watchdog to fix stuck inactive
 * jobs (if any) by calling
 */
// Currently redis is stable and doesn't crash.
// queue.watchStuckJobs()

/**
 * Create a new job.
 * @param name string name of job
 * @param data object params that will pass to processor
 * @param configuration object job configurations
 */
function createJob(name, data, configurations) {

  // merge default configurations with user configs
  var config = Object.assign({
    onFailed: function (err) {},
    onComplete: function () {},
    priority: 'normal',
    attempts: 10,
    removeOnComplete: true,
    backoff: [10, 30, 120, 300, 600, 1200, 1800, 2400, 3600, 7200],
    delay: 0,
  }, configurations || {})

  if (config.attempts > config.backoff.length)
    config.attempts = config.backoff.length

  // make backoff accessible inside backoff() function
  data.__backoff = config.backoff

  queue.create(name, data)
    .on('complete', config.onComplete)
    .on('failed', config.onFailed)
    .removeOnComplete(config.removeOnComplete)
    .priority(config.priority)
    .ttl(config.ttl)
    .attempts(config.attempts)
    .delay(config.delay)
    .backoff(function (attempts, delay) {
      return this.data.__backoff[attempts - 1] * 1000
    })
    .save()
}

/**
 * Process a job.
 * @param name string the name of process name
 * @param concurrency number job concurrency
 * @param processor function* job processor
 */
function processJob(name, concurrency, processor) {

  queue.process(name, concurrency, function (job, done) {
    co(function* () {
      return yield processor(job)
    }).then(function(result){
      done(null, result)
    }, done)
  })
}
