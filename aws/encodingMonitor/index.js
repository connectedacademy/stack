const aws = require('aws-sdk')

const API_VERSION = process.env.API_VERSION
const BUCKET_URI = process.env.BUCKET_URI

const awsTranscribe = new aws.TranscribeService()

async function startJob(params) {
  return new Promise(function (resolve, reject) {
    awsTranscribe.startTranscriptionJob(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        reject(err)
      } else {
        console.log(data)
        resolve(data)
      }
    })
  })
}

exports.handler = async (event, context) => {

  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))
  let jobName = key

  jobName = jobName.replace('encoded/', '')
  jobName = jobName.replace('-128.mp3', '')

  const uri = `${BUCKET_URI}/${key}`
  console.log('uri', uri)
  console.log('jobName', jobName)

  // Begin transcription of audio
  var params = {
    LanguageCode: 'en-US',
    Media: {
      MediaFileUri: uri
    },
    MediaFormat: 'mp3',
    TranscriptionJobName: jobName,
    // MediaSampleRateHertz: 0,
    Settings: {
      // MaxSpeakerLabels: 6,
      // ShowSpeakerLabels: false,
      // VocabularyName: 'STRING_VALUE'
    }
  }

  const result = await startJob(params)

  console.log('result', result)

  return result
}
