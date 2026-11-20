import Message from '../models/Message.js';

// A schedule belongs to the account whose id is stored in schedule.userId.
export const isScheduleOwner = (schedule, user) =>
  String(schedule.userId) === String(user._id);

// The owner can always read a schedule. Anyone else can read it only if the
// owner shared it with them in chat (a 'schedule' message addressed to them).
export const canViewSchedule = async (schedule, user) => {
  if (isScheduleOwner(schedule, user)) return true;

  const shared = await Message.exists({
    messageType: 'schedule',
    scheduleId: schedule._id,
    'receiver.id': user._id,
  });

  return Boolean(shared);
};
