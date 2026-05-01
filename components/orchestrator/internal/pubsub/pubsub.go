package pubsub

import (
	"sync"

	"github.com/sirupsen/logrus"

	"github.com/alextargov/iot-proj/components/orchestrator/internal/model"
)

type MetricPubSub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan *model.DeviceMetric]struct{}
	log         *logrus.Logger
}

func NewMetricPubSub(log *logrus.Logger) *MetricPubSub {
	return &MetricPubSub{
		subscribers: make(map[string]map[chan *model.DeviceMetric]struct{}),
		log:         log,
	}
}

func (ps *MetricPubSub) Subscribe(deviceID string) <-chan *model.DeviceMetric {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	ch := make(chan *model.DeviceMetric, 10)

	if ps.subscribers[deviceID] == nil {
		ps.subscribers[deviceID] = make(map[chan *model.DeviceMetric]struct{})
	}
	ps.subscribers[deviceID][ch] = struct{}{}

	ps.log.WithField("deviceId", deviceID).Debug("New metric subscription")
	return ch
}

func (ps *MetricPubSub) Unsubscribe(deviceID string, ch <-chan *model.DeviceMetric) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	if subs, ok := ps.subscribers[deviceID]; ok {
		for subCh := range subs {
			if subCh == ch {
				close(subCh)
				delete(subs, subCh)
				break
			}
		}
		if len(subs) == 0 {
			delete(ps.subscribers, deviceID)
		}
	}

	ps.log.WithField("deviceId", deviceID).Debug("Metric subscription removed")
}

func (ps *MetricPubSub) Publish(deviceID string, metric *model.DeviceMetric) {
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	subs, ok := ps.subscribers[deviceID]
	if !ok {
		return
	}

	for ch := range subs {
		select {
		case ch <- metric:
		default:
			ps.log.WithField("deviceId", deviceID).Warn("Subscriber channel full, dropping metric")
		}
	}
}

func (ps *MetricPubSub) SubscriberCount(deviceID string) int {
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	if subs, ok := ps.subscribers[deviceID]; ok {
		return len(subs)
	}
	return 0
}
