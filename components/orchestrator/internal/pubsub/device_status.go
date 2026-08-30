package pubsub

import (
	"sync"

	"github.com/sirupsen/logrus"
)

// DeviceStatusEvent is the payload published when a device's status changes.
type DeviceStatusEvent struct {
	DeviceID string
	Status   string
}

// wildcardKey is used to register subscribers that want status events for ALL
// devices (i.e. the device list view). A per-device subscriber registers under
// its deviceID; a wildcard subscriber receives every device's status change.
const wildcardKey = "*"

// DeviceStatusPubSub is an in-memory fan-out for device status changes. It
// mirrors MetricPubSub but carries status events and supports a wildcard
// subscription for consumers that track all devices at once.
type DeviceStatusPubSub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan *DeviceStatusEvent]struct{}
	log         *logrus.Logger
}

func NewDeviceStatusPubSub(log *logrus.Logger) *DeviceStatusPubSub {
	return &DeviceStatusPubSub{
		subscribers: make(map[string]map[chan *DeviceStatusEvent]struct{}),
		log:         log,
	}
}

// Subscribe registers a subscriber for a specific device. An empty deviceID
// subscribes to status changes for all devices.
func (ps *DeviceStatusPubSub) Subscribe(deviceID string) <-chan *DeviceStatusEvent {
	key := deviceID
	if key == "" {
		key = wildcardKey
	}

	ps.mu.Lock()
	defer ps.mu.Unlock()

	ch := make(chan *DeviceStatusEvent, 10)

	if ps.subscribers[key] == nil {
		ps.subscribers[key] = make(map[chan *DeviceStatusEvent]struct{})
	}
	ps.subscribers[key][ch] = struct{}{}

	ps.log.WithField("deviceId", key).Debug("New device status subscription")
	return ch
}

// Unsubscribe removes and closes a subscriber's channel.
func (ps *DeviceStatusPubSub) Unsubscribe(deviceID string, ch <-chan *DeviceStatusEvent) {
	key := deviceID
	if key == "" {
		key = wildcardKey
	}

	ps.mu.Lock()
	defer ps.mu.Unlock()

	if subs, ok := ps.subscribers[key]; ok {
		for subCh := range subs {
			if subCh == ch {
				close(subCh)
				delete(subs, subCh)
				break
			}
		}
		if len(subs) == 0 {
			delete(ps.subscribers, key)
		}
	}

	ps.log.WithField("deviceId", key).Debug("Device status subscription removed")
}

// Publish fans a status change out to that device's subscribers and to any
// wildcard subscribers. Full subscriber channels are skipped (non-blocking).
func (ps *DeviceStatusPubSub) Publish(deviceID, status string) {
	event := &DeviceStatusEvent{DeviceID: deviceID, Status: status}

	ps.mu.RLock()
	defer ps.mu.RUnlock()

	ps.deliver(ps.subscribers[deviceID], event)
	ps.deliver(ps.subscribers[wildcardKey], event)
}

func (ps *DeviceStatusPubSub) deliver(subs map[chan *DeviceStatusEvent]struct{}, event *DeviceStatusEvent) {
	for ch := range subs {
		select {
		case ch <- event:
		default:
			ps.log.WithField("deviceId", event.DeviceID).Warn("Subscriber channel full, dropping status event")
		}
	}
}
