const aws = require('aws-sdk')

const API_VERSION = process.env.API_VERSION
const ELASTIC_PIPELINE = process.env.ELASTIC_PIPELINE
const OUTPUT_PREFIX = process.env.OUTPUT_PREFIX

const s3 = new aws.S3({ apiVersion: API_VERSION })
const awsTranscoder = new aws.ElasticTranscoder()


function getObjectKey(event) {
  // Get the object key from the event
  return decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))
}

async function startTranscoderJob(key, filename) {
  // Start transcoder job
  return new Promise(function (resolve, reject) {
    awsTranscoder.createJob({
      PipelineId: ELASTIC_PIPELINE,
      OutputKeyPrefix: OUTPUT_PREFIX,
      Input: { Key: key, FrameRate: 'auto', Resolution: 'auto', AspectRatio: 'auto', Interlaced: 'auto', Container: 'auto' },
      Outputs: [
        { Key: `${filename}-32.mp3`, PresetId: '1529491490031-ufq1e4' },
        { Key: `${filename}-64.mp3`, PresetId: '1529502348077-41fwvg' },
        { Key: `${filename}-128.mp3`, PresetId: '1529502497860-njbwzh' },
        { Key: `${filename}-32.webm`, PresetId: '1529502410402-pxtfq8' },
        { Key: `${filename}-64.webm`, PresetId: '1529502465940-1d7me5' },
        { Key: `${filename}-128.webm`, PresetId: '1529502479270-mdbaqe' },
      ],
    }, (err, data) => {
      if (err) {
        console.error(err)
        reject(err)
      }
      resolve(data)
    })
  })
}

exports.handler = async (event, context) => {

  const key = getObjectKey(event)
  let filename = key

  filename = filename.replace('audio/', '')
  filename = filename.replace('.mp3', '')

  const result = await startTranscoderJob(key, filename)

  console.log('result', result)
}
