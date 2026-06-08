/**
 * Set SINCE to the creation date when a team is first saved.
 */
export default {
  beforeCreate(event: { params: { data: { since?: string } } }) {
    if (!event.params.data.since) {
      event.params.data.since = new Date().toISOString().slice(0, 10);
    }
  },
};
