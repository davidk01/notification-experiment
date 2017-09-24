// Actor methods have to return an object that conforms to this
// interface because we will use this information to decide if we need
// to inform our listeners of changes
interface ActorAction {
    notify: boolean;
}

class EventNode {
    // We keep track of the nodes we depend on because we might
    // want to poll from them instead of just waiting for notifications
    dependencies: Array<EventNode> = [];
    // We also have a list of listeners. When something about us changes
    // we send notifications to our listeners
    listeners: Array<EventNode> = [];
    // The set of messages we need to process. All notifications end up
    // in the mailbox first
    mailbox: Array<any> = [];
    // Whatever state associated with this node that the actor code
    // can make use of
    state: any = {};

    // The constructor is just parametrized with the code that will be
    // acting on the events in the mailbox
    constructor(private actor: (self: EventNode, event: any) => ActorAction) {}

    // Add a listener that we should modify upon changes happening to us
    toNotify(n: EventNode): void {
        this.listeners.push(n);
    }

    // Notify this node about something
    notify(event: any): void {
        this.mailbox.push(event);
    }

    // What other nodes do we rely on. When we rely on a node we add
    // ourselves to its list of listeners
    dependsOn(n: EventNode): void {
        this.dependencies.push(n);
        n.toNotify(this);
    }

    // Process an event from the mailbox. As written it is possible
    // to overflow the mailbox. In a real production system this should
    // be bounded
    act(): void {
        let event = this.mailbox.shift();
        if (event) {
            let actorAction = this.actor(this, event);
            // Do we need to notify our listeners after we took this action?
            if (actorAction.notify) {
                this.listeners.forEach(node => { node.notify(this); });
            }
        }
    }
}

// Make some nodes
let first = new EventNode(
    (self, event) => {
        if (event.change) {
            if (self.state.counter) {
                self.state.counter += 1;
            } else {
                self.state.counter = 1;
            }
            return {notify: true};
        }
        return {notify: false};
    }
);
let second = new EventNode(
    (self, event) => {
        if (event.change) {
            if (self.state.counter) {
                self.state.counter += 1;
            } else {
                self.state.counter = 1;
            }
            return {notify: true};
        }
        return {notify: false};
    }
);

// Connect them
first.dependsOn(second);

// First node doesn't have any listeners so when we change it
// nothing should happen
first.notify({change: true});
first.act();
second.act();

// Send an event that does not change the state of second
second.notify({});
second.act();
first.act();

// Send an event that changes the state of second
second.notify({change: true});
second.act();
first.act();

// Verify that first got the notification and changed as well
console.log(first.state);
console.log(second.state);

// Verify that the mailboxes are empty
console.log(first.mailbox);
console.log(second.mailbox);