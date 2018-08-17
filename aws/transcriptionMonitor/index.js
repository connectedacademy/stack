const aws = require('aws-sdk')
const request = require('request-promise')

const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION
const API_VERSION = process.env.API_VERSION
const TOPIC_ARN = process.env.TOPIC_ARN
const INTERVAL_MINUTES = process.env.INTERVAL_MINUTES
const MAX_JOB_RESULTS = process.env.MAX_JOB_RESULTS

const awsConfig = {
  apiVersion: API_VERSION,
  region: S3_REGION
}

const s3 = new aws.S3(awsConfig)
const awsTranscribe = new aws.TranscribeService(awsConfig)
const sns = new aws.SNS(awsConfig)

async function checkStatus() {
        
    // Get current jobs
    const jobs = await getTranscriptionJobs()
    let completedJobs = []
    let recentJobs = []
    
    // Loop jobs
    for (const job of jobs.TranscriptionJobSummaries) {
        
        // Check job is less than X minutes old
        const completion = new Date(job.CompletionTime)
        const minutes = INTERVAL_MINUTES
        const diff = 1000 * 60 * minutes
        
        // Perform check
        if (completion > (Date.now() - diff)) {
            
            console.log(`Found a job that completed in the last ${minutes} minutes`)
            recentJobs.push(job)
        }
    }
    
    // Loop recent jobs
    for (let recentJob of recentJobs) {
        
        // Check if job output in bucket
        const key = `transcripts/${recentJob.TranscriptionJobName}.json`
        const inBucket = await jobResultInBucket(key)
        
        // If not in bucket, download
        if (!inBucket) {
            console.log("Not in bucket")
            
            // Download job result to bucket
            recentJob = await downloadJobResultToBucket(recentJob)
            
            // Notify site through SNS
            completedJobs.push(recentJob)
        } else {
            console.log("In bucket")
        }
    }
    
    return completedJobs
}

async function getTranscriptionJobs() {
    
    return new Promise(function (resolve, reject) {
        var params = {
          // JobNameContains: 'STRING_VALUE',
          MaxResults: MAX_JOB_RESULTS,
          // NextToken: 'STRING_VALUE',
          Status: 'COMPLETED' // IN_PROGRESS | FAILED | COMPLETED
        }
        awsTranscribe.listTranscriptionJobs(params, function (err, data) {
          if (err) {
            reject(err)
          }
          else {
            console.log('data', data)
            resolve(data)
          }
        })
    })
}

async function jobResultInBucket(key) {
    
    console.log('Checking if job result is in bucket...')
    
    s3.headObject({
      Bucket: S3_BUCKET,
      Key: key
    })
    .on('success', function (response) {
      console.log('File exists on S3', key)
      return true
    })
    .on('error', async function (error) {
      console.log('File does not exist on S3', key)
      return false
    }).send()
}

async function downloadJobResultToBucket(job) {
    
    console.log("Downloading job result to bucket")
    
    // Fetch transcription  
    const transcriptionFile = await getTranscriptionFile(job.TranscriptionJobName)
  
    // Save to bucket
  const result = await saveTranscriptionFile(transcriptionFile, `${job.TranscriptionJobName}.json`)
    
    return result
}

async function getTranscriptionFile(TranscriptionJobName) {
  console.log('getTranscriptionFile called')
  
  return new Promise(function (resolve, reject) {
    awsTranscribe.getTranscriptionJob({
      TranscriptionJobName: TranscriptionJobName
    }, function (err, data) {
      if (err) {
        reject(err)
      }

      const options = {
        uri: data.TranscriptionJob.Transcript.TranscriptFileUri,
        json: true
      }

      request(options)
        .then(function (data) {
          resolve(data)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  })
}

async function saveTranscriptionFile(file, filename) {
  
  return new Promise(function (resolve, reject) {
    const key = `transcripts/${filename}`
    params = { Bucket: S3_BUCKET, Key: key, Body: JSON.stringify(file), ACL: 'public-read', ContentType: 'Application/json' }
    s3.putObject(params, function (err, data) {
      if (err) {
        console.log(err)
        reject()
      } else {
        console.log('Successfully uploaded', key)
        resolve(key)
      }
    })
  })
}

async function notifySystem(job) {

  return new Promise(function(resolve, reject) {
    var params = {
      MessageStructure: 'json',
      Message: '{ "default": "Completed upload, encoding and transcription of file" }',
      Subject: 'Transcription Complete',
      TopicArn: TOPIC_ARN
    }
    
    sns.publish(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      }
      else {
        console.log(data)
        resolve(data)
      }
    })
  })
}
exports.handler = async (event) => {
    console.log('Checking for recently completed transcription jobs')
    
    const completedJobs = await checkStatus()
    
    console.log('Completed jobs count', completedJobs.length)
    
    console.log('Looping jobs..')

    for (const job of completedJobs) {

      console.log('job', job)
        
      // Notify system of completed job via SNS
      const result = await notifySystem(job)
      
      console.log('sns result', result);
      
    }
}