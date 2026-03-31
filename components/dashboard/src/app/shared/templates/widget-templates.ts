export interface WidgetTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'alerts' | 'scheduling' | 'control' | 'monitoring';
    workspace: string;
}

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
    {
        id: 'temperature_alert',
        name: 'Temperature Alert',
        description: 'Send an email when temperature exceeds a threshold',
        icon: 'thermostat',
        category: 'alerts',
        workspace: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="controls_if" x="50" y="50">
    <value name="IF0">
      <block type="logic_compare">
        <field name="OP">GT</field>
        <value name="A">
          <block type="aggregation_2">
            <field name="MODE">7Days</field>
          </block>
        </value>
        <value name="B">
          <block type="math_number">
            <field name="NUM">30</field>
          </block>
        </value>
      </block>
    </value>
    <statement name="DO0">
      <block type="operation_2">
        <value name="operation">
          <block type="text">
            <field name="TEXT">admin@example.com</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
</xml>`,
    },
    {
        id: 'scheduled_control',
        name: 'Scheduled Device Control',
        description: 'Turn device on/off at regular intervals',
        icon: 'schedule',
        category: 'scheduling',
        workspace: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="repeatForBlock" x="50" y="50">
    <field name="interval">10</field>
    <field name="unit">minutes</field>
    <statement name="DO">
      <block type="controls_if">
        <value name="IF0">
          <block type="logic_boolean">
            <field name="BOOL">TRUE</field>
          </block>
        </value>
        <statement name="DO0">
          <block type="operation_0"></block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
    },
    {
        id: 'threshold_notification',
        name: 'Threshold Notification',
        description: 'Send detailed email when value crosses threshold',
        icon: 'notifications_active',
        category: 'alerts',
        workspace: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="controls_if" x="50" y="50">
    <mutation else="1"></mutation>
    <value name="IF0">
      <block type="logic_compare">
        <field name="OP">LT</field>
        <value name="A">
          <block type="aggregation_2">
            <field name="MODE">1Hour</field>
          </block>
        </value>
        <value name="B">
          <block type="math_number">
            <field name="NUM">10</field>
          </block>
        </value>
      </block>
    </value>
    <statement name="DO0">
      <block type="operation_3">
        <value name="operation">
          <block type="text">
            <field name="TEXT">admin@example.com</field>
          </block>
        </value>
        <value name="additional">
          <block type="text">
            <field name="TEXT">Warning: Value below threshold!</field>
          </block>
        </value>
      </block>
    </statement>
    <statement name="ELSE">
      <block type="operation_3">
        <value name="operation">
          <block type="text">
            <field name="TEXT">admin@example.com</field>
          </block>
        </value>
        <value name="additional">
          <block type="text">
            <field name="TEXT">Value is normal.</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
</xml>`,
    },
    {
        id: 'device_toggle',
        name: 'Device Toggle',
        description: 'Simple on/off control based on condition',
        icon: 'toggle_on',
        category: 'control',
        workspace: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="controls_if" x="50" y="50">
    <mutation else="1"></mutation>
    <value name="IF0">
      <block type="logic_compare">
        <field name="OP">GT</field>
        <value name="A">
          <block type="aggregation_2">
            <field name="MODE">1Hour</field>
          </block>
        </value>
        <value name="B">
          <block type="math_number">
            <field name="NUM">25</field>
          </block>
        </value>
      </block>
    </value>
    <statement name="DO0">
      <block type="operation_0"></block>
    </statement>
    <statement name="ELSE">
      <block type="operation_1"></block>
    </statement>
  </block>
</xml>`,
    },
    {
        id: 'periodic_check',
        name: 'Periodic Health Check',
        description: 'Monitor device status at regular intervals and alert on issues',
        icon: 'monitor_heart',
        category: 'monitoring',
        workspace: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="repeatForBlock" x="50" y="50">
    <field name="interval">30</field>
    <field name="unit">minutes</field>
    <statement name="DO">
      <block type="controls_if">
        <value name="IF0">
          <block type="logic_compare">
            <field name="OP">EQ</field>
            <value name="A">
              <block type="aggregation_2">
                <field name="MODE">1Hour</field>
              </block>
            </value>
            <value name="B">
              <block type="math_number">
                <field name="NUM">0</field>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="operation_3">
            <value name="operation">
              <block type="text">
                <field name="TEXT">admin@example.com</field>
              </block>
            </value>
            <value name="additional">
              <block type="text">
                <field name="TEXT">Device not responding!</field>
              </block>
            </value>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`,
    },
    {
        id: 'blank',
        name: 'Start from Scratch',
        description: 'Empty workspace for custom automation',
        icon: 'dashboard_customize',
        category: 'control',
        workspace: `<xml xmlns="https://developers.google.com/blockly/xml"></xml>`,
    },
];

export const TEMPLATE_CATEGORIES = [
    { id: 'alerts', name: 'Alerts', icon: 'warning' },
    { id: 'scheduling', name: 'Scheduling', icon: 'schedule' },
    { id: 'control', name: 'Control', icon: 'tune' },
    { id: 'monitoring', name: 'Monitoring', icon: 'analytics' },
];
