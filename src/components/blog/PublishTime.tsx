import moment from 'moment'

interface Props {
    date: string
}

export default function PublishTime(props: Props) {
    const { date } = props
    // if the date was withing the past 2 days we want to use fromNow()
    // other wise calendar({ sameElse: "DD/MM/yyyy" }) will be used

    let time = null
    if (moment(date).isAfter(moment().subtract(2, 'days'))) {
        time = moment(date).fromNow()
    } else {
        time = moment(date).calendar({ sameElse: 'DD/MM/yyyy' })
    }

    const title = moment(date).format('dddd, MMMM Do YYYY, h:mm:ss a')

    return (
        <>
            <time dateTime={date} className="text-sm" style={{ textTransform: 'lowercase' }} title={title}>
                {time}
            </time>
        </>
    )
}
